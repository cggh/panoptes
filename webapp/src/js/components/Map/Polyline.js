import PropTypes from 'prop-types';
import React from 'react';
import {Polyline as LeafletPolyline} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let Polyline = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    positions: PropTypes.array,
  },

  render() {
    return (
      <LeafletPolyline
        {...this.props}
      />
    );
  }
});

export default Polyline;
