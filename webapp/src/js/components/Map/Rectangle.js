import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {Rectangle as LeafletRectangle} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let Rectangle = createReactClass({
  displayName: 'Rectangle',

  mixins: [
    FluxMixin
  ],

  propTypes: {
    bounds: PropTypes.array
  },

  render() {
    return (
      <LeafletRectangle
        bounds={this.props.bounds}
      />
    );
  },
});

export default Rectangle;
