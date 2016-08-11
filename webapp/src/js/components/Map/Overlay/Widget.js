import React from 'react';

import {LayersControl} from 'react-leaflet';
const {Overlay} = LayersControl;

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let OverlayWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    addOverlay: React.PropTypes.func,
    checked: React.PropTypes.string,
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    name: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      name: 'Overlay'
    };
  },

  render() {
    let {addOverlay, checked, children, layerContainer, map, name} = this.props;

console.log('OverlayWidget props: %o', this.props);

    let checkedBoolean = (checked === 'true');

    if (!checkedBoolean instanceof Boolean) {
      checkedBoolean = null;
    }

    if (children instanceof Array) {
      children = children[0];
    }

    return (
      <Overlay
        addOverlay={addOverlay}
        checked={checkedBoolean}
        layerContainer={layerContainer}
        map={map}
        name={name}
        children={children}
      />

    );

  }

});

module.exports = OverlayWidget;
