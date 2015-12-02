const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const LRUCache = require('util/LRUCache');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');

// Panoptes components
const API = require('panoptes/API');
const SQL = require('panoptes/SQL');
const Map = require('panoptes/Map');

// UI components
const Loading = require('ui/Loading');

let MapContainer = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('locationDataTable', 'chartDataTable')
  ],

  propTypes: {
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
    locationDataTable: React.PropTypes.string,
    properties: React.PropTypes.object
  },

  getDefaultProps() {
    return {
      zoom: 3
    };
  },

  getInitialState() {
    return {
      locationData: [],
      chartData: [],
      loadStatus: 'loaded'
    };
  },


  fetchData(props, requestContext)
  {
    let {locationDataTable, properties} = props;

    let locationTableConfig = this.config.tables[locationDataTable];

    // Check that the table specified for locations has geo coordinates.
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

    API.pageQuery({
      database: this.config.dataset,
      table: locationTableConfig.fetchTableName,
      columns: locationColumnsColumnSpec
    })
      .then((data) => {
          this.setState({locationData: data});
          this.setState({loadStatus: 'loaded'});
      })
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
    let {locationDataTable, zoom, properties, chartData} = this.props;

    let {locationNameProperty, locationSizeProperty, residualFractionName, positionOffsetFraction, pieChartSize, componentColumns, dataType} = properties;

    let center = {lat: properties.mapCenter.lattitude, lng: properties.mapCenter.longitude};

    let {locationData, loadStatus} = this.state;

    let markers = [];

    if (locationData)
    {
      // Translate the fetched locationData into markers.

      let locationTableConfig = this.config.tables[locationDataTable];
      let locationPrimKeyProperty = locationTableConfig.primkey

      for (let i = 0; i < locationData.length; i++)
      {
        let markerChartData = [];

        for (let j = 0; j < componentColumns.length; j++)
        {
          markerChartData.push(
            {
              name: componentColumns[j].name,
              value: chartData[componentColumns[j].pattern.replace('{locid}', locationData[i][locationPrimKeyProperty])],
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
             chartData: markerChartData
          }
        );
      }
    }

    return (
      <div style = {{width:'100%', height:'100%'}}>
        <Map
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

module.exports = MapContainer;
