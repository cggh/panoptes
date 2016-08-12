import React from 'react';
import {Marker} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let MarkerWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map might be provided as props here rather than context (e.g. by ComponentMarker).
  // So, copying the layerContainer and map into context...

  propTypes: {
    alt: React.PropTypes.string,
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    onClick: React.PropTypes.func,
    position: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array]).isRequired,
    title: React.PropTypes.string,

  },

  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer,
      map: this.props.map
    };
  },

  render() {

    let {alt, children, onClick, position, title} = this.props;

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
        position={adaptedPosition}
        title={title}
        onClick={(e) => onClick(e)}
      />
    );

  }

});

module.exports = MarkerWidget;
