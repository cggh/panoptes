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
  
  render() {
    
    
      // TODO: use the classic marker
    
      //let marker = new google.maps.Marker({position: new google.maps.LatLng(this.props.lat, this.props.lng), title: 'title goes here'});
      
//      return (
//          <div>{marker}</div>
//      );
    
    
    return (
      <svg style={{'overflow':'visible'}}><circle r="5" fill="blue"/></svg>
    );
  }
});

module.exports = ItemMapMarker;
