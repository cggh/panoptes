const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const GoogleMap = require('google-map-react');
const ReactDOM =require('react-dom');

// Utils
const DetectResize = require('utils/DetectResize');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

function getMapOptions(maps) {
  return {
    zoomControlOptions: {
      position: maps.ControlPosition.RIGHT_BOTTOM, 
      style: maps.ZoomControlStyle.SMALL 
    },
    mapTypeControlOptions: {
      position: maps.ControlPosition.TOP_LEFT, 
      StreetViewStatus: true
    },
    mapTypeControl: true
  };
}

let ItemMap = React.createClass({
  
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],
  
  propTypes: {
    marker: React.PropTypes.object,
    zoom: React.PropTypes.number
  },
  
  getInitialState() {
    return {
      maps: null,
      map: null
    };
  },
  
  onResize : function() 
  {
    this._googleMapRef._setViewSize();
    
    if (this.state.maps && this.state.map)
    {
      let center =  this.state.map.getCenter();
      this.state.maps.event.trigger(this.state.map, 'resize');
      this.state.map.setCenter(center);
    }
  },
  
  render()
  {
    let {marker, zoom} = this.props;
    let {maps, map} = this.state;
    
    let googleMap = <div></div>;
    let itemMapMarker = null;
    let center = null;
    
    // TODO: use an API key from config
    // <GoogleMap ...  bootstrapURLKeys={{key: 'AIza...example...1n8'}}
    
    if (marker.lat && marker.lng)
    {
      if (maps && map)
      {
        // Create a new marker at the given position.
        let itemMapMarker = new maps.Marker({
          position: {lat: marker.lat, lng: marker.lng},
          map: map
        });
      }
      
      // Set the map's center to the coordinates of the marker.
      center = {lat: marker.lat, lng: marker.lng};
      
      googleMap = (
        <DetectResize onResize={this.onResize}>
          <GoogleMap
            center={center}
            zoom={zoom}
            yesIWantToUseGoogleMapApiInternals={true}
            onGoogleApiLoaded={({map, maps}) => this.setState({map: map, maps: maps})}
            options={getMapOptions}
            ref={r => this._googleMapRef = r}
          >
          </GoogleMap>
        </DetectResize>
      );
    }
    
    return googleMap;
    
  }

});

module.exports = ItemMap;
