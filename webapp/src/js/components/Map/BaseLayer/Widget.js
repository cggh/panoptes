import React from 'react';

import {LayersControl} from 'react-leaflet';
const {BaseLayer} = LayersControl;

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let BaseLayerWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    addBaseLayer: React.PropTypes.func,
    checked: React.PropTypes.string,
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    name: React.PropTypes.string.isRequired
  },

  render() {
    let {addBaseLayer, checked, children, layerContainer, map, name} = this.props;
console.log('BaseLayerWidget props: %o', this.props);
    let checkedBoolean = (checked === 'true');

    if (!checkedBoolean instanceof Boolean) {
      checkedBoolean = null;
    }

    children = children[0];

    return (
      <BaseLayer
        checked={checkedBoolean}
        name={name}
        children={children}
        layerContainer={layerContainer}
        map={map}
        addBaseLayer={addBaseLayer}
      />
    );

  }

});

module.exports = BaseLayerWidget;
