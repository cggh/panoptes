import React from 'react';
import {Polyline as LeafletPolyline} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let Polyline = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    positions: React.PropTypes.array,
  },

  render() {
    return (
      <LeafletPolyline
        {...this.props}
      />
    );
  }
});

module.exports = Polyline;
