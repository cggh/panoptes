import React from 'react';

import {LayersControl as LeafletLayersControl} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'TileLayer',
  'FeatureGroup',
];

let BaseLayer = React.createClass({

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
    addBaseLayer: React.PropTypes.func,
    checked: React.PropTypes.bool,
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    name: React.PropTypes.string,
    removeLayer: React.PropTypes.func, // Required when the BaseLayer is changed
    removeLayerControl: React.PropTypes.func
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

  }

});

module.exports = BaseLayer;
