import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {LayersControl as LeafletLayersControl} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'BaseLayer',
  'Overlay'
];

let LayersControl = createReactClass({
  displayName: 'LayersControl',

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
    autoZIndex: PropTypes.bool,
    children: PropTypes.node,
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    removeLayer: PropTypes.func,
    removeLayerControl: PropTypes.func
  },

  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map
    };
  },

  render() {

    let {autoZIndex, children, removeLayer, removeLayerControl} = this.props;
    let filteredChildren = filterChildren(this, children, ALLOWED_CHILDREN);

    // NB: Only the position prop is dynamic.
    // https://github.com/PaulLeCam/react-leaflet/blob/master/docs/Components.md#layerscontrol

    return (
      <LeafletLayersControl
        autoZIndex={autoZIndex}
        children={filteredChildren}
        ref={(ref) => this.layersControl = ref}
        removeLayer={removeLayer}
        removeLayerControl={removeLayerControl}
      />
    );

  },
});

export default LayersControl;
