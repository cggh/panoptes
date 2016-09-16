import React from 'react';
import {Marker} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Lodash
import _isFunction from 'lodash/isFunction';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'PopupWidget'
];

let MarkerWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

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
    position: React.PropTypes.array.isRequired,
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


    if (children instanceof Array) {
      if (children.length > 1) {
        console.warn('MarkerWidget received more than one child. Using first child.');
        // NB: <Marker><foo /><bar /></ Marker> would error,
        // whereas <Marker><baz><foo /><bar /></baz></ Marker> is valid.
      }
      // NB: The single child object is often passed to Map components as the first element of an array.
      // However, an array would cause an error if it was passed forward as this component's children.
      children = children[0];
    }

    return (
      <Marker
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

module.exports = MarkerWidget;
