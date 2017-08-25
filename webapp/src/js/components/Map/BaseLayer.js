import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import {LayersControl as LeafletLayersControl} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'TileLayer',
  'FeatureGroup',
];

let BaseLayer = createReactClass({
  displayName: 'BaseLayer',

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
    addBaseLayer: PropTypes.func,
    checked: PropTypes.bool,
    children: PropTypes.node,
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    name: PropTypes.string,
    removeLayer: PropTypes.func, // Required when the BaseLayer is changed
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

  getDefaultProps() {
    return {
      name: 'Base layer'
    };
  },

  render() {

    let {addBaseLayer, checked, children, name, removeLayer, removeLayerControl} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);

    if (children) {
      children = React.Children.only(children);
    }

    return (
      <LeafletLayersControl.BaseLayer
        addBaseLayer={addBaseLayer}
        checked={checked}
        children={children}
        name={name}
        removeLayer={removeLayer}
        removeLayerControl={removeLayerControl}
      />
    );

  },
});

export default BaseLayer;
