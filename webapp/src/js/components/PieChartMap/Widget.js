import React from 'react';
import _sumBy from 'lodash/sumBy';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';


// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Utils
import LRUCache from 'util/LRUCache';

// Panoptes components
import API from 'panoptes/API';
import PieChartMap from 'panoptes/PieChartMap';
import ErrorReport from 'panoptes/ErrorReporter';

// UI components
import Loading from 'ui/Loading';

// Constants in this component
const RESIDUAL_SECTOR_COLOR = 'rgb(191,191,191)';


let PieChartMapWidget = React.createClass({

  mixins: [
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chartConfig', 'table', 'primKey')
  ],

  propTypes: {
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
    center: React.PropTypes.object,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired,
    chartConfig: ImmutablePropTypes.map.isRequired,
    componentUpdate: React.PropTypes.func.isRequired,
    defaultResidualFractionName: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      defaultResidualFractionName: 'Other'
    };
  },

  getInitialState() {
    return {
      loadStatus: 'loaded',
      markers: Immutable.List()
    };
  },

  fetchData(props, requestContext) {
    let {chartConfig, table, primKey, defaultResidualFractionName} = props;
    chartConfig = chartConfig.toJS();
    let {locationDataTable, locationNameProperty, locationSizeProperty,
      residualFractionName, componentColumns} = chartConfig;

    let locationTableConfig = this.config.tablesById[locationDataTable];
    // Check that the table specified for locations has geographic coordinates.
    if (locationTableConfig.hasGeoCoord === false) {
      console.error('locationTableConfig.hasGeoCoord === false');
      return null;
    }

    this.setState({
      loadStatus: 'loading'
    });

    let locationPrimKeyProperty = locationTableConfig.primKey;

    let locationColumns = [locationPrimKeyProperty, locationTableConfig.longitude, locationTableConfig.latitude];

    if (chartConfig.locationNameProperty) {
      locationColumns.push(chartConfig.locationNameProperty);
    }

    if (chartConfig.locationSizeProperty) {
      locationColumns.push(chartConfig.locationSizeProperty);
    }

    let locationColumnsColumnSpec = {};
    locationColumns.map((column) => locationColumnsColumnSpec[column] = locationTableConfig.propertiesById[column].defaultDisplayEncoding);

    let locationAPIargs = {
      database: this.config.dataset,
      table: locationTableConfig.fetchTableName,
      columns: locationColumnsColumnSpec
    };

    let chartAPIargs = {
      database: this.config.dataset,
      table: table,
      primKeyField: this.config.tablesById[table].primKey,
      primKeyValue: primKey
    };

    requestContext.request(
      (componentCancellation) =>
        Promise.all([
          LRUCache.get(
            'pageQuery' + JSON.stringify(locationAPIargs), (cacheCancellation) =>
              API.pageQuery({
                cancellation: cacheCancellation,
                ...locationAPIargs
              }),
            componentCancellation
          ),
          LRUCache.get(
            'fetchSingleRecord' + JSON.stringify(chartAPIargs), (cacheCancellation) =>
              API.fetchSingleRecord({
                cancellation: cacheCancellation,
                ...chartAPIargs
              }),
            componentCancellation
          )
        ])
      )
      .then(([locationData, chartData]) => {
        let markers = Immutable.List();
        // Translate the fetched locationData and chartData into markers.
        let locationTableConfig = this.config.tablesById[locationDataTable];
        let locationPrimKeyProperty = locationTableConfig.primKey;

        for (let i = 0; i < locationData.length; i++) {
          let markerChartData = [];
          let locationDataPrimKey = locationData[i][locationPrimKeyProperty];

          for (let j = 0; j < componentColumns.length; j++) {
            let chartDataColumnIndex = componentColumns[j].pattern.replace('{locid}', locationDataPrimKey);
            markerChartData.push({
              name: componentColumns[j].name,
              value: chartData[chartDataColumnIndex] !== null ? chartData[chartDataColumnIndex] : 0,
              color: componentColumns[j].color
            });
          }

          let sum = _sumBy(markerChartData, 'value');
          if (sum < 1)
            markerChartData.push({
              name: residualFractionName !== null ? residualFractionName : defaultResidualFractionName,
              value: (1 - sum).toFixed(2),
              color: RESIDUAL_SECTOR_COLOR
            });

          markers = markers.push(Immutable.fromJS({
            key: i,
            lat: locationData[i][locationTableConfig.latitude],
            lng: locationData[i][locationTableConfig.longitude],
            name: locationData[i][locationNameProperty],
            radius: Math.sqrt(locationData[i][locationSizeProperty]),
            chartData: markerChartData,
            locationTable: locationDataTable,
            locationPrimKey: locationDataPrimKey
          }));
        }

        this.setState({
          loadStatus: 'loaded',
          markers: markers
        });
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
        this.setState({
          loadStatus: 'error'
        });
      });
  },

  title() {
    return this.props.title;
  },

  handlePanZoom({center, zoom}) {
    if (zoom != this.props.zoom ||
      this.props.center.get('lat') != center.lat ||
      this.props.center.get('lng') != center.lng) {
      this.props.componentUpdate({center, zoom});
    }
  },

  render() {
    let {center, zoom} = this.props;
    let {loadStatus, markers} = this.state;
    return (
      <div style={{width: '100%', height: '100%'}}>
          <PieChartMap
            center={center}
            zoom={zoom}
            markers={markers}
            onPanZoom={this.handlePanZoom}
          />
          <Loading status={loadStatus}/>
      </div>
    );

  }

});

module.exports = PieChartMapWidget;
