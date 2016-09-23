import React from 'react';

import {LayersControl} from 'react-leaflet';
const {Overlay} = LayersControl;

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'CircleWidget',
  'FeatureGroupWidget',
  'ImageOverlayWidget',
  'MarkerWidget',
  'PopupWidget',
  'RectangleWidget',
  'TableMarkersLayerWidget',
  'TileLayerWidget'
];

let OverlayWidget = React.createClass({

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
    addOverlay: React.PropTypes.func,
    checked: React.PropTypes.bool,
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    name: React.PropTypes.string
  },
  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  getDefaultProps() {
    return {
      name: 'Overlay'
    };
  },

  render() {

    let {addOverlay, checked, children, name} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);

    return (
      <Overlay
        addOverlay={addOverlay}
        checked={checked}
        children={React.Children.only(children)}
        name={name}
      />

    );

  }

});

module.exports = OverlayWidget;
