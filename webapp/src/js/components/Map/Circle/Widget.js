import React from 'react';
import {Circle as LeafletCircle} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let Circle = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.object,
    radius: React.PropTypes.number,
  },

  render() {
    let {center, radius} = this.props;
    return (
      <LeafletCircle
        children={null}
        center={center}
        radius={radius}
      />
    );
  }
});

module.exports = Circle;
