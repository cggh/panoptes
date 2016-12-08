import React from 'react';
import {Marker as LeafletMarker} from 'react-leaflet';

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
    fillColour: React.PropTypes.string,
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

    // TODO: use fillColour or its default
    let {alt, children, fillColour, onClick, opacity, position, title, zIndexOffset} = this.props;

    children = filterChildren(this, children, ALLOWED_CHILDREN);

    if (children) {
      children = React.Children.only(children);
    }

    // TODO: Use SVG markers instead, so we can easily change the colour, etc.
    // FIXME: Works around broken default marker icon in react-leaflet v1.0.0-rc.1
    let icon = window.L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.1/images/marker-shadow.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.1/images/marker-icon-2x.png',
      iconAnchor: [12.5, 41]
    });

    return (
      <LeafletMarker
        position={position}
        onClick={onClick || (() => null)}
        alt={alt}
        title={title || alt}
        children={children}
        opacity={opacity}
        zIndexOffset={zIndexOffset}
        icon={icon}
      />
    );

  }

});

export default Marker;
