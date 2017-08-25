import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {CircleMarker as LeafletCircle} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let Circle = createReactClass({
  displayName: 'Circle',

  mixins: [
    FluxMixin
  ],

  propTypes: {
    center: PropTypes.object,
    radius: PropTypes.number,
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
  },
});

export default Circle;
