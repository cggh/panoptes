const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');

// Panoptes components
const API = require('panoptes/API');
const ItemMap = require('panoptes/ItemMap');

// UI components
const Loading = require('ui/Loading');

let ItemMapTab = React.createClass({
  
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('locationDataTable')
  ],
  
  propTypes: {
    title: React.PropTypes.string,
    zoom: React.PropTypes.number,
    locationDataTable: React.PropTypes.string,
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
  
  
  fetchData(props)
  {
    let {locationDataTable} = props;
    
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
    
    let locationColumnsColumnSpec = {};
    locationColumns.map(column => locationColumnsColumnSpec[column] = locationTableConfig.propertiesMap[column].defaultDisplayEncoding);
    
    API.pageQuery({
      database: this.config.dataset,
      table: locationTableConfig.fetchTableName,
      columns: locationColumnsColumnSpec
    })
      .then((locationData) => {
          this.setState({locationData: locationData});
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
    let {locationDataTable, zoom, center} = this.props;
    
    let {locationData, loadStatus} = this.state;
    
    let markers = [];
    
    if (locationData)
    {
      // Translate the fetched locationData into markers.
      let locationTableConfig = this.config.tables[locationDataTable];
      
      for (let i = 0; i < locationData.length; i++)
      {
        markers.push(
          {
             lat: locationData[i][locationTableConfig.propIdGeoCoordLattit], 
             lng: locationData[i][locationTableConfig.propIdGeoCoordLongit]
          }
        );
      }
      
    }
    
    return (
      <div style={{width:'100%', height:'100%'}}>
        <ItemMap 
          center={center} 
          zoom={zoom} 
          markers={markers} 
        />
        <Loading status={loadStatus}/>
      </div>
    );
    
  }

});

module.exports = ItemMapTab;
