import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {Polyline as LeafletPolyline} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let Polyline = createReactClass({
  displayName: 'Polyline',

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
  },
});

export default Polyline;
