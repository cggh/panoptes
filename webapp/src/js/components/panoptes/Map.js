const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const GoogleMap = require('google-map-react');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

// Panoptes components
const Circle = require('panoptes/Circle');

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
  

  
  render()
  {
    let {center, zoom, markers} = this.props;
    
    // TODO: get a proper API key
    // <GoogleMap ...  bootstrapURLKeys={{key: 'AIza...example...1n8'}}
    
    // google.maps.event.trigger(map, 'resize');
    
    return (
      <div style = {{width:'100%', height:'100%'}}>
        <GoogleMap
          center={center}
          zoom={zoom}
        >
          {markers.map(function(marker, index){
            return <Circle key={index} lat={marker.lat} lng={marker.lng}/>
          })}
        </GoogleMap>
      </div>
    );
    
  }

});

module.exports = Map;
