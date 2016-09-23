import React from 'react';
import {LayersControl} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

import _cloneDeep from 'lodash/cloneDeep';

const ALLOWED_CHILDREN = [
  'BaseLayerWidget',
  'OverlayWidget'
];

let LayersControlWidget = React.createClass({

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
    autoZIndex: React.PropTypes.bool,
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
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

  render() {
// console.log('LayersControl props: %o', _cloneDeep(this.props));
// console.log('LayersControl context: %o', _cloneDeep(this.context));
    let {autoZIndex, children} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);

    return (
      <LayersControl
        autoZIndex={autoZIndex}
        children={children}
      />
    );

  }

});

module.exports = LayersControlWidget;
