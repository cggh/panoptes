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
    name: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      name: 'Overlay'
    };
  },

  render() {
    let {addOverlay, checked, children, name} = this.props;

console.log('OverlayWidget props: %o', this.props);
console.log('OverlayWidget context: %o', this.context);

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
        name={name}
        children={children}
      />

    );

  }

});

module.exports = OverlayWidget;
