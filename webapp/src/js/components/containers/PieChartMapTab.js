const React = require('react');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
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

let PieChartMapTab = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('locationDataTable', 'chartDataTable', 'chartDataTablePrimKey')
  ],

  propTypes: {
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
    locationDataTable: React.PropTypes.string,
    properties: React.PropTypes.object,
    chartDataTable: React.PropTypes.string,
    chartDataTablePrimKey: React.PropTypes.string,
    center: React.PropTypes.object
  },

  getDefaultProps() {
    return {
      zoom: 3,
      center: {lat: 0, lng: 0}
    };
  },

  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },

  fetchData(props, requestContext)
  {
    let {locationDataTable, properties, chartDataTable, chartDataTablePrimKey} = props;

    let locationTableConfig = this.config.tables[locationDataTable];

    // Check that the table specified for locations has geographic coordinates.
    if (locationTableConfig.hasGeoCoord === false)
    {
     console.error("locationTableConfig.hasGeoCoord === false");
     return null;
    }

    this.setState({loadStatus: 'loading'});

    let locationPrimKeyProperty = locationTableConfig.primkey;

    let locationColumns = [locationPrimKeyProperty, locationTableConfig.propIdGeoCoordLongit, locationTableConfig.propIdGeoCoordLattit];

    if (properties.locationNameProperty)
    {
      locationColumns.push(properties.locationNameProperty);
    }

    if (properties.locationSizeProperty)
    {
      locationColumns.push(properties.locationSizeProperty);
    }

    let locationColumnsColumnSpec = {};
    locationColumns.map(column => locationColumnsColumnSpec[column] = locationTableConfig.propertiesMap[column].defaultDisplayEncoding);

    let locationAPIargs = {
      database: this.config.dataset,
      table: locationTableConfig.fetchTableName,
      columns: locationColumnsColumnSpec
    };

    let chartAPIargs = {
      database: this.config.dataset,
      table: chartDataTable,
      primKeyField: this.config.tables[chartDataTable].primkey,
      primKeyValue: chartDataTablePrimKey
    };

    requestContext.request(
      (componentCancellation) =>
        Promise.all([
          LRUCache.get(
            'pageQuery' + JSON.stringify(locationAPIargs),
            (cacheCancellation) =>
              API.pageQuery({cancellation: cacheCancellation, ...locationAPIargs}),
            componentCancellation
          ),
          LRUCache.get(
            'fetchSingleRecord' + JSON.stringify(chartAPIargs),
            (cacheCancellation) =>
              API.fetchSingleRecord({cancellation: cacheCancellation, ...chartAPIargs}),
            componentCancellation
          )])
      )
      .then(([locationData, chartData]) => this.setState({
        loadStatus: 'loaded',
        locationData: locationData,
        chartData: chartData
      }))
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

  render()
  {
    let {locationDataTable, zoom, center, properties} = this.props;

    let {locationNameProperty, locationSizeProperty, residualFractionName, positionOffsetFraction, pieChartSize, componentColumns, dataType} = properties;

    let {locationData, loadStatus, chartData} = this.state;

    let markers = [];

    if (locationData && chartData)
    {
      // Translate the fetched locationData and chartData into markers.
      let locationTableConfig = this.config.tables[locationDataTable];
      let locationPrimKeyProperty = locationTableConfig.primkey

      for (let i = 0; i < locationData.length; i++)
      {
        let markerChartData = [];

        let locationDataPrimKey = locationData[i][locationPrimKeyProperty];

        for (let j = 0; j < componentColumns.length; j++)
        {
          let chartDataColumnIndex = componentColumns[j].pattern.replace('{locid}', locationDataPrimKey);

          markerChartData.push(
            {
              name: componentColumns[j].name,
              value: chartData[chartDataColumnIndex],
              color: componentColumns[j].color
            }
          );
        }

        markers.push(
          {
             lat: locationData[i][locationTableConfig.propIdGeoCoordLattit],
             lng: locationData[i][locationTableConfig.propIdGeoCoordLongit],
             locationName: locationData[i][locationNameProperty],
             locationSize: locationData[i][locationSizeProperty],
             chartData: markerChartData,
             locationTable: locationDataTable,
             locationPrimKey: locationDataPrimKey
          }
        );
      }
    }

    return (
      <div style={{width:'100%', height:'100%'}}>
        <PieChartMap
          center={center}
          zoom={zoom}
          markers={markers}
          pieChartSize={pieChartSize}
          residualFractionName={residualFractionName}
          positionOffsetFraction={positionOffsetFraction}
          dataType={dataType}
        />
        <Loading status={loadStatus}/>
      </div>
    );

  }

});

module.exports = PieChartMapTab;
