import React from 'react';
import {Rectangle} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let RectangleWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    bounds: React.PropTypes.array
  },

  render() {
    return (
      <Rectangle
        bounds={this.props.bounds}
      />
    );
  }
});

module.exports = RectangleWidget;
