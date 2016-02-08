import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
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

let ItemMapTab = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('locationDataTable', 'locationDataTablePrimKey')
  ],

  propTypes: {
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
    locationDataTable: React.PropTypes.string,
    locationDataTablePrimKey: React.PropTypes.string,
    center: React.PropTypes.object
  },

  getDefaultProps() {
    return {
      zoom: 4
    };
  },

  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },


  fetchData(props, requestContext) {
    let {locationDataTable, locationDataTablePrimKey} = props;

    let locationTableConfig = this.config.tables[locationDataTable];

    // Check that the table specified for locations has geographic coordinates.
    if (locationTableConfig.hasGeoCoord === false) {
      console.error('locationTableConfig.hasGeoCoord === false');
      return null;
    }

    this.setState({loadStatus: 'loading'});

    let locationPrimKeyProperty = locationTableConfig.primkey;

    let locationColumns = [locationPrimKeyProperty, locationTableConfig.propIdGeoCoordLongit, locationTableConfig.propIdGeoCoordLattit];

    let locationColumnsColumnSpec = {};
    locationColumns.map((column) => locationColumnsColumnSpec[column] = locationTableConfig.propertiesMap[column].defaultDisplayEncoding);

    let APIargs = {
      database: this.config.dataset,
      table: locationDataTable,
      primKeyField: this.config.tables[locationDataTable].primkey,
      primKeyValue: locationDataTablePrimKey
    };

    requestContext.request((componentCancellation) =>
      LRUCache.get(
        'fetchSingleRecord' + JSON.stringify(APIargs),
        (cacheCancellation) =>
          API.fetchSingleRecord({cancellation: cacheCancellation, ...APIargs}),
        componentCancellation
      )
    )
    .then((locationData) => {
      this.setState({loadStatus: 'loaded', locationData: locationData});
    })
    .catch(API.filterAborted)
    .catch(LRUCache.filterCancelled)
    .catch((error) => {
      ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
      this.setState({loadStatus: 'error'});
    });
  },

  title() {
    return this.props.title;
  },

  render() {
    let {locationDataTable, zoom} = this.props;

    let {locationData, loadStatus} = this.state;

    let marker = {};

    if (locationData) {
      // Translate the fetched locationData into a marker.
      let locationTableConfig = this.config.tables[locationDataTable];

      marker = {
        lat: Number(locationData[locationTableConfig.propIdGeoCoordLattit]),
        lng: Number(locationData[locationTableConfig.propIdGeoCoordLongit])
      };
    }

    return (
      <div style={{width: '100%', height: '100%'}}>
        <ItemMap marker={marker} zoom={zoom}/>
        <Loading status={loadStatus}/>
      </div>
    );

  }

});

module.exports = ItemMapTab;
