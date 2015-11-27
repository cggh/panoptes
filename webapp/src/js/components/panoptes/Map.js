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
    if (this.state.maps && this.state.map)
    {
      this.state.maps.event.trigger(this.state.map, 'resize');
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
        >
          {markers.map(function(marker, index){
            return <Circle key={index} lat={marker.lat} lng={marker.lng}/>
          })}
        </GoogleMap>
    );
    
  }

});

module.exports = Map;
