import React from 'react';
import {Marker as LeafletMarker} from 'react-leaflet';
import {DivIcon, Point} from 'leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'MapPopup'
];

let Marker = React.createClass({

  mixins: [
    FluxMixin
  ],

  contextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },
  propTypes: {
    alt: React.PropTypes.string,
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    onClick: React.PropTypes.func,
    opacity: React.PropTypes.number,
    zIndexOffset: React.PropTypes.number,
    position: React.PropTypes.object,
    title: React.PropTypes.string
  },
  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map
    };
  },

  render() {

    let {alt, children, onClick, opacity, position, title, zIndexOffset} = this.props;

    children = filterChildren(this, children, ALLOWED_CHILDREN);

    if (children) {
      children = React.Children.only(children);
    }

    return (
      <LeafletMarker
        position={position}
        onClick={onClick || (() => null)}
        alt={alt}
        title={title || alt}
        children={children}
        opacity={opacity}
        zIndexOffset={zIndexOffset}
      />
    );

  }

});

module.exports = Marker;
