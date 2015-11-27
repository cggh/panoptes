const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const GoogleMap = require('google-map-react');
const ReactDOM =require('react-dom');

// Utils
const detectResize = require('util/DetectElementResize');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

// Panoptes components
const Circle = require('panoptes/Circle');

// TODO: Can we move these option settings upstream?
function getMapOptions(maps) {
  return {
    zoomControlOptions: {
      position: maps.ControlPosition.RIGHT_BOTTOM, //9
      style: maps.ZoomControlStyle.SMALL //1
    },
    mapTypeControlOptions: {
      position: maps.ControlPosition.TOP_LEFT, //1
      StreetViewStatus: true
    },
    mapTypeControl: true
  };
}

let Map = React.createClass({
  
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],
  
  propTypes: {
    center: React.PropTypes.object,
    zoom: React.PropTypes.number,
    markers: React.PropTypes.array
  },
  
  getInitialState() {
    return {
      maps: null,
      map: null
    };
  },
  
  componentDidMount : function(){
    detectResize.addResizeListener(ReactDOM.findDOMNode(this), this.onResize);
  },
  
  componentWillUnmount : function(){
    detectResize.removeResizeListener(ReactDOM.findDOMNode(this), this.onResize);
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
    let {center, zoom, markers} = this.props;
    
    // TODO: get a proper API key
    // <GoogleMap ...  bootstrapURLKeys={{key: 'AIza...example...1n8'}}
    
    // google.maps.event.trigger(map, 'resize');
    
    
    
    return (
        <GoogleMap
          center={center}
          zoom={zoom}
          yesIWantToUseGoogleMapApiInternals={true}
          onGoogleApiLoaded={({map, maps}) => this.setState({map: map, maps: maps})}
          options={getMapOptions}
          ref={r => this._googleMapRef = r}
        >
          {markers.map(function(marker, index){
            return <Circle key={index} lat={marker.lat} lng={marker.lng}/>
          })}
        </GoogleMap>
    );
    
  }

});

module.exports = Map;
