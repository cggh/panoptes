import React from 'react';
import {Marker} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let MarkerWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    position: React.PropTypes.string.isRequired
  },


  render() {

    let {children, layerContainer, map, position} = this.props;

console.log('MarkerWidget props: %o', this.props);

    let adaptedPosition = undefined;

    if (position instanceof Array) {
      adaptedPosition = position;
    }
    if (typeof position === 'string') {
      // TODO: check the string looks like "[0, 0]" before trying to parse.
      let positionArrayFromString = JSON.parse(position);
      if (positionArrayFromString instanceof Array) {
        adaptedPosition = positionArrayFromString;
      }
    }

    if (adaptedPosition === undefined || adaptedPosition === null) {
      console.error('MarkerWidget failed to determine position');
    }

    return (
      <Marker
        children={children}
        layerContainer={layerContainer}
        map={map}
        position={adaptedPosition}
      />
    );

  }

});

module.exports = MarkerWidget;
