import React from 'react';
import {Circle} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let CircleWidget = React.createClass({

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
      <Circle
        children={null}
        center={center}
        radius={radius}
      />
    );
  }
});

module.exports = CircleWidget;
