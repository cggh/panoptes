import React from 'react';

// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Utils
import LRUCache from 'util/LRUCache';

// Panoptes components
import API from 'panoptes/API';
import MapView from 'Map/LeafletView';
import ErrorReport from 'panoptes/ErrorReporter';

// UI components
import Loading from 'ui/Loading';

let MapWidget = React.createClass({

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey', 'highlight')
  ],

  propTypes: {
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
    center: React.PropTypes.object,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string, // if not specified then all table records are used
    componentUpdate: React.PropTypes.func,
    lngProperty: React.PropTypes.string, // alternatively derived from the table config
    latProperty: React.PropTypes.string, // alternatively derived from the table config
    width: React.PropTypes.string, // alternatively default
    height: React.PropTypes.string, // alternatively default
    highlight: React.PropTypes.string
  },

  getInitialState() {
    return {
      loadStatus: 'loaded',
      markers: []
    };
  },

  getDefaultProps() {
    return {
      width: '100%',
      height: '100%'
    };
  },

  fetchData(props, requestContext) {
//FIXME: Initial load from ListWithActions (default 1st selected) > DataItemWidget, isn't showing marker.
    let {table, primKey, lngProperty, latProperty, highlight} = props;

    let locationTableConfig = this.config.tablesById[table];
    // Check that the table specified for locations has geographic coordinates.
    if (locationTableConfig.hasGeoCoord === false) {
      console.error('locationTableConfig.hasGeoCoord === false');
      return null;
    }

    this.setState({
      loadStatus: 'loading'
    });

    let locationPrimKeyProperty = locationTableConfig.primKey;

    // If specified, use the lat lng properties from the props.
    // Otherwise, use the lat lng properties from the config.
    let locationLongitudeProperty = lngProperty ? lngProperty : locationTableConfig.longitude;
    let locationLatitudeProperty = latProperty ? latProperty : locationTableConfig.latitude;

    let locationColumns = [locationPrimKeyProperty, locationLongitudeProperty, locationLatitudeProperty];

    if (highlight) {
      let [highlightField] = highlight.split(':');
      if (highlightField) {
        locationColumns.push(highlightField);
      }
    }

    let locationColumnsColumnSpec = {};
    locationColumns.map((column) => locationColumnsColumnSpec[column] = locationTableConfig.propertiesById[column].defaultDisplayEncoding);

    requestContext.request(
      (componentCancellation) => {

        // If a primKey value has been specified, then fetch that single record,
        // Otherwise, do a page query.
        if (primKey) {

          // Fetch the single record for the specified primKey value.
          let APIargs = {
            database: this.config.dataset,
            table: table,
            primKeyField: this.config.tablesById[table].primKey,
            primKeyValue: primKey
          };

          return LRUCache.get(
            'fetchSingleRecord' + JSON.stringify(APIargs), (cacheCancellation) =>
              API.fetchSingleRecord({
                cancellation: cacheCancellation,
                ...APIargs
              }),
            componentCancellation
          );

        } else {

          // If no primKey is provided, then get all markers using the specified table.
          let locationAPIargs = {
            database: this.config.dataset,
            table: locationTableConfig.fetchTableName,
            columns: locationColumnsColumnSpec
          };

          return LRUCache.get(
            'pageQuery' + JSON.stringify(locationAPIargs), (cacheCancellation) =>
              API.pageQuery({
                cancellation: cacheCancellation,
                ...locationAPIargs
              }),
            componentCancellation
          );

        }

      })
      .then((data) => {

        let markers = [];

        // Translate the fetched locationData into markers.
        let locationTableConfig = this.config.tablesById[table];
        let locationPrimKeyProperty = locationTableConfig.primKey;

        // If a primKey value has been specified then expect data to contain a single record.
        // Otherwise data should contain an array of records.
        if (primKey) {

          let locationDataPrimKey = data[locationPrimKeyProperty];

          markers.push({
            lat: parseFloat(data[locationTableConfig.latitude]),
            lng: parseFloat(data[locationTableConfig.longitude]),
            title: locationDataPrimKey,
            table: table,
            primKey: locationDataPrimKey
          });

        } else {

          let highlightField, highlightValue = null;
          if (highlight) {
            [highlightField, highlightValue] = highlight.split(':');
          }

          for (let i = 0; i < data.length; i++) {

            let locationDataPrimKey = data[i][locationPrimKeyProperty];

            let isHighlighted = false;
            if (highlightField !== null && highlightValue !== null) {
              isHighlighted = (data[i][highlightField] === highlightValue ? true : false);
            }

            markers.push({
              lat: parseFloat(data[i][locationTableConfig.latitude]),
              lng: parseFloat(data[i][locationTableConfig.longitude]),
              title: locationDataPrimKey,
              table: table,
              primKey: locationDataPrimKey,
              isHighlighted: isHighlighted
            });

          }

        }

        this.setState({
          loadStatus: 'loaded',
          markers: markers
        });
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled);
      // FIXME:
      // .catch((error) => {
      //   ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
      //   this.setState({
      //     loadStatus: 'error'
      //   });
      // });
  },

  title() {
    return this.props.title;
  },


  render() {
    let {center, zoom, width, height} = this.props;
    let {loadStatus, markers} = this.state;
    return (
      <div style={{width: width, height: height}}>
          <MapView
            center={center}
            zoom={zoom}
            markers={markers}
          />
          <Loading status={loadStatus}/>
      </div>
    );

  }

});

module.exports = MapWidget;
