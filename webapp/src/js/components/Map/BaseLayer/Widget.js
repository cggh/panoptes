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
    checked: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.bool]),
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    name: React.PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
      name: 'Base Layer'
    };
  },

  render() {
    let {addBaseLayer, checked, children, layerContainer, layerOptions, map, name} = this.props;
console.log('BaseLayerWidget props: %o', this.props);

    let checkedBoolean = null;
    if (
      (typeof checked === 'string' && checked.toLowerCase() === 'true')
      || (typeof checked === 'boolean' && checked === true)
    ) {
      checkedBoolean = true;
    } else {
      checkedBoolean = false;
    }

    if (checkedBoolean === null) {
      console.error('BaseLayerWidget could not determine checked status');
    }

    if (children instanceof Array) {
      children = children[0];
    }

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
