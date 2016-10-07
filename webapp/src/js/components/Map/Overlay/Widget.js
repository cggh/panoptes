import React from 'react';

import {LayersControl as LeafletLayersControl} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'Circle',
  'FeatureGroup',
  'ImageOverlay',
  'Marker',
  'MapPopup',
  'Rectangle',
  'TableMarkersLayer',
  'TileLayer'
];

let Overlay = React.createClass({

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
    addOverlay: React.PropTypes.func,
    checked: React.PropTypes.bool,
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    name: React.PropTypes.string,
    removeLayer: React.PropTypes.func,
    removeLayerControl: React.PropTypes.func
  },
  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  getDefaultProps() {
    return {
      name: 'Overlay'
    };
  },

  render() {

    let {addOverlay, checked, children, name, removeLayer, removeLayerControl} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);

    return (
      <LeafletLayersControl.Overlay
        addOverlay={addOverlay}
        checked={checked}
        children={React.Children.only(children)}
        name={name}
        removeLayer={removeLayer}
        removeLayerControl={removeLayerControl}
      />

    );

  }

});

module.exports = Overlay;
