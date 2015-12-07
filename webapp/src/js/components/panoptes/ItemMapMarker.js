const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');


let ItemMapMarker = React.createClass({
  
  mixins: [
     PureRenderMixin,
     FluxMixin
  ],
  
  render()
  {
    
    // TODO: SVG marker
    //    return (
    //      <svg style={{'overflow':'visible'}}><circle r="5" fill="blue"/></svg>
    //    );
    
    let markerSizeInPixels = 32;
    let markerStyle = {
      position: 'absolute',
      width: markerSizeInPixels,
      height: markerSizeInPixels,
      left: -(markerSizeInPixels / 2),
      top: -markerSizeInPixels
    }
    
    return (
        <img style={markerStyle} src="http://www.google.com/intl/en_us/mapfiles/ms/micons/red-dot.png" />
    );
    
  }
  
  
});

module.exports = ItemMapMarker;
