import React from 'react';
import Immutable from 'immutable';

// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Utils
import LRUCache from 'util/LRUCache';

// Panoptes components
import API from 'panoptes/API';
import ItemMap from 'panoptes/ItemMap';
import ErrorReport from 'panoptes/ErrorReporter';

// UI components
import Loading from 'ui/Loading';

let ItemMapWidget = React.createClass({

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
    center: React.PropTypes.object,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string,
    componentUpdate: React.PropTypes.func.isRequired,
    lngProperty: React.PropTypes.string,
    latProperty: React.PropTypes.string
  },

  getInitialState() {
    return {
      loadStatus: 'loaded',
      markers: Immutable.List()
    };
  },

  fetchData(props, requestContext) {
    let {table, primKey, lngProperty, latProperty} = props;

    let locationDataTable = table;

    let locationTableConfig = this.config.tables[locationDataTable];
    // Check that the table specified for locations has geographic coordinates.
    if (locationTableConfig.hasGeoCoord === false) {
      console.error('locationTableConfig.hasGeoCoord === false');
      return null;
    }

    this.setState({
      loadStatus: 'loading'
    });

    let locationPrimKeyProperty = locationTableConfig.primkey;

    // If specified, use the lat lng properties from the props.
    // Otherwise, use the lat lng properties from the config.
    let locationLongitudeProperty = lngProperty ? lngProperty : locationTableConfig.propIdGeoCoordLongit;
    let locationLatitudeProperty = latProperty ? latProperty : locationTableConfig.propIdGeoCoordLattit;

    let locationColumns = [locationPrimKeyProperty, locationLongitudeProperty, locationLatitudeProperty];

    let locationColumnsColumnSpec = {};
    locationColumns.map((column) => locationColumnsColumnSpec[column] = locationTableConfig.propertiesMap[column].defaultDisplayEncoding);

    requestContext.request(
      (componentCancellation) => {

        // If a primKey value has been specified, then fetch that single record,
        // Otherwise, do a page query.
        if (primKey) {

          // Fetch the single record for the specified primKey value.
          let APIargs = {
            database: this.config.dataset,
            table: table,
            primKeyField: this.config.tables[table].primkey,
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
        let markers = Immutable.List();
        // Translate the fetched locationData and chartData into markers.
        let locationTableConfig = this.config.tables[locationDataTable];
        let locationPrimKeyProperty = locationTableConfig.primkey;

        // If a primKey value has been specified then expect data to contain a single record.
        // Otherwise data should contain an array of records.
        if (primKey) {

          let locationDataPrimKey = data[locationPrimKeyProperty];

          // FIXME: handle just 1 marker
          // FIXME: use proper values (currently error)
          // FIXME: radius

          markers = markers.push(Immutable.fromJS({
            key: 0,
            lat: parseFloat(data[locationTableConfig.propIdGeoCoordLattit]),
            lng: parseFloat(data[locationTableConfig.propIdGeoCoordLongit]),
            name: locationDataPrimKey,
            radius: 10,
            locationTable: locationDataTable,
            locationPrimKey: locationDataPrimKey
          }));

          // FIXME: fails if these markers have same lng (impacts multiple-mode, there should only be one marker here)

          markers = markers.push(Immutable.fromJS({
            key: 1,
            lat: parseFloat(data[locationTableConfig.propIdGeoCoordLattit]),
            lng: parseFloat(data[locationTableConfig.propIdGeoCoordLongit]) + 0.1, //-6.01, //parseFloat(data[locationTableConfig.propIdGeoCoordLongit]),
            name: locationDataPrimKey,
            radius: 10,
            locationTable: locationDataTable,
            locationPrimKey: locationDataPrimKey
          }));

        } else {

          for (let i = 0; i < data.length; i++) {
            let locationDataPrimKey = data[i][locationPrimKeyProperty];

          // FIXME: fails any two of these markers have the same longitude.
          // FIXME: radius

            markers = markers.push(Immutable.fromJS({
              key: i,
              lat: parseFloat(data[i][locationTableConfig.propIdGeoCoordLattit]),
              lng: parseFloat(data[i][locationTableConfig.propIdGeoCoordLongit]) + i, //parseFloat(data[i][locationTableConfig.propIdGeoCoordLongit]),
              name: locationDataPrimKey,
              radius: 10, //data[i][locationSizeProperty],
              locationTable: locationDataTable,
              locationPrimKey: locationDataPrimKey
            }));

          }

        }

        this.setState({
          loadStatus: 'loaded',
          markers: markers
        });
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
        this.setState({
          loadStatus: 'error'
        });
      });
  },

  title() {
    return this.props.title;
  },

  handlePanZoom({center, zoom}) {
    this.props.componentUpdate({center, zoom});
  },

  render() {
    let {center, zoom} = this.props;
    let {loadStatus, markers} = this.state;
    return (
      <div style={{width: '100%', height: '100%'}}>
        {loadStatus === 'loaded' ?
          <ItemMap
            center={center}
            zoom={zoom}
            markers={markers}
            onPanZoom={this.handlePanZoom}
          /> :
          <Loading status={loadStatus}/>
        }
      </div>
    );

  }

});

module.exports = ItemMapWidget;
