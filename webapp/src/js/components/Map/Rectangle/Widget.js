import React from 'react';
import {Rectangle as LeafletRectangle} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let Rectangle = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    bounds: React.PropTypes.array
  },

  render() {
    return (
      <LeafletRectangle
        bounds={this.props.bounds}
      />
    );
  }
});

module.exports = Rectangle;
