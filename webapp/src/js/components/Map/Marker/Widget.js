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
    onClickMarker: React.PropTypes.func,
    popupContainer: React.PropTypes.object,
    position: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array]).isRequired,
    title: React.PropTypes.string,
    alt: React.PropTypes.string
  },

  render() {
    window.force = this.forceUpdate.bind(this);

    let {alt, children, layerContainer, map, onClickMarker, popupContainer, position, title} = this.props;

    if (alt === undefined && title !== undefined) {
      alt = title;
    }

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
        alt={alt}
        children={children}
        layerContainer={layerContainer}
        map={map}
        popupContainer={popupContainer}
        position={adaptedPosition}
        title={title}
        onClick={(e) => onClickMarker(e)}
      />
    );

  }

});

module.exports = MarkerWidget;
