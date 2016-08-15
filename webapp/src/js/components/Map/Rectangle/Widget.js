import React from 'react';
import {Rectangle} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let RectangleWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    bounds: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array])
  },

  render() {

    let {bounds} = this.props;

    let adaptedProps = {};

    if (bounds instanceof Array) {
      adaptedProps.bounds = bounds;
    }
    if (typeof bounds === 'string') {
      // TODO: check the string looks like "[[51.49, -0.08],[51.5, -0.06],]" before trying to parse.
      let boundsArrayFromString = JSON.parse(bounds);
      if (boundsArrayFromString instanceof Array) {
        adaptedProps.bounds = boundsArrayFromString;
      }
    }

    if (adaptedProps.bounds === undefined || adaptedProps.bounds === null) {
      console.error('RectangleWidget failed to determine bounds');
    }

    return (
      <Rectangle
        children={null}
        {...adaptedProps}
      />
    );

  }

});

module.exports = RectangleWidget;
