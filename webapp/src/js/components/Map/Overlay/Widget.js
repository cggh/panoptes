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
    children = filterChildren(this, children, ALLOWED_CHILDREN);

    let checkedBoolean = (checked === 'true');

    if (!checkedBoolean instanceof Boolean) {
      checkedBoolean = null;
    }

    return (
      <Overlay
        addOverlay={addOverlay}
        checked={checkedBoolean}
        name={name}
        children={React.Children.only(children)}
      />

    );

  }

});

module.exports = OverlayWidget;
