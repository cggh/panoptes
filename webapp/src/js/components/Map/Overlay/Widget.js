import React from 'react';

import {LayersControl} from 'react-leaflet';
const {Overlay} = LayersControl;

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'TableMarkersLayerWidget',
  'MarkerWidget',
  'CircleWidget',
  'RectangleWidget',
  'PopupWidget',
  'FeatureGroupWidget',
  'TileLayerWidget'
];

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
    children = filterChildren(this, ALLOWED_CHILDREN, children);

    let checkedBoolean = (checked === 'true');

    if (!checkedBoolean instanceof Boolean) {
      checkedBoolean = null;
    }

    if (children instanceof Array) {
      if (children.length > 1) {
        console.warn('OverlayWidget received more than one child. Using first child.');
      }
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
