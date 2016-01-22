const React = require('react');
const _sumBy = require('lodash/sumBy');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');


// Mixins
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');

// Utils
const LRUCache = require('util/LRUCache');

// Panoptes components
const API = require('panoptes/API');
const PieChartMap = require('panoptes/PieChartMap');
const ErrorReport = require('panoptes/ErrorReporter');

// UI components
const Loading = require('ui/Loading');

// Constants in this component
const RESIDUAL_SECTOR_COLOR = 'rgb(191,191,191)';


let PieChartMapTab = React.createClass({

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
    componentUpdate: React.PropTypes.func.isRequired
  },

  getInitialState() {
    return {
      loadStatus: 'loaded',
      markers: Immutable.List()
    };
  },

  fetchData(props, requestContext) {
    let {chartConfig, table, primKey} = props;
    chartConfig = chartConfig.toJS();
    let {locationDataTable, locationNameProperty, locationSizeProperty,
      residualFractionName, componentColumns} = chartConfig;

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

    let locationColumns = [locationPrimKeyProperty, locationTableConfig.propIdGeoCoordLongit, locationTableConfig.propIdGeoCoordLattit];

    if (chartConfig.locationNameProperty) {
      locationColumns.push(chartConfig.locationNameProperty);
    }

    if (chartConfig.locationSizeProperty) {
      locationColumns.push(chartConfig.locationSizeProperty);
    }

    let locationColumnsColumnSpec = {};
    locationColumns.map((column) => locationColumnsColumnSpec[column] = locationTableConfig.propertiesMap[column].defaultDisplayEncoding);

    let locationAPIargs = {
      database: this.config.dataset,
      table: locationTableConfig.fetchTableName,
      columns: locationColumnsColumnSpec
    };

    let chartAPIargs = {
      database: this.config.dataset,
      table: table,
      primKeyField: this.config.tables[table].primkey,
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
        let locationTableConfig = this.config.tables[locationDataTable];
        let locationPrimKeyProperty = locationTableConfig.primkey;

        for (let i = 0; i < locationData.length; i++) {
          let markerChartData = [];
          let locationDataPrimKey = locationData[i][locationPrimKeyProperty];

          for (let j = 0; j < componentColumns.length; j++) {
            let chartDataColumnIndex = componentColumns[j].pattern.replace('{locid}', locationDataPrimKey);
            markerChartData.push({
              name: componentColumns[j].name,
              value: chartData[chartDataColumnIndex],
              color: componentColumns[j].color
            });
          }
          if (residualFractionName || residualFractionName === '') {
            let sum = _sumBy(markerChartData, 'value');
            if (sum < 1)
              markerChartData.push({
                name: residualFractionName,
                value: 1 - sum,
                color: RESIDUAL_SECTOR_COLOR
              });
          }

          markers = markers.push(Immutable.fromJS({
            key: i,
            lat: locationData[i][locationTableConfig.propIdGeoCoordLattit],
            lng: locationData[i][locationTableConfig.propIdGeoCoordLongit],
            name: locationData[i][locationNameProperty],
            radius: locationData[i][locationSizeProperty],
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
    console.log('pan', center, zoom);
    this.props.componentUpdate({center, zoom});
  },

  render() {
    let {center, zoom} = this.props;
    let {loadStatus, markers} = this.state;
    return (
      <div style={{width: '100%', height: '100%'}}>
        {loadStatus === 'loaded' ?
          <PieChartMap
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

module.exports = PieChartMapTab;
