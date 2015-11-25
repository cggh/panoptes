const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');


let Circle = React.createClass({
  
  mixins: [
             PureRenderMixin,
             FluxMixin
  ],
  
  
  render() {
    return (
      <svg style={{'overflow':'visible'}}><circle r="10" fill="blue"/></svg>
    );
  }
});

module.exports = Circle;
