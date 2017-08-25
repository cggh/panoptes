import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

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

let Overlay = createReactClass({
  displayName: 'Overlay',

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },

  propTypes: {
    addOverlay: PropTypes.func,
    checked: PropTypes.bool,
    children: PropTypes.node,
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    name: PropTypes.string,
    removeLayer: PropTypes.func,
    removeLayerControl: PropTypes.func
  },

  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
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

  },
});

export default Overlay;
