import React from 'react';

import {FeatureGroup as LeafletFeatureGroup} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'ComponentMarker',
  'TableMarkersLayer',
  'Marker',
  'Circle',
  'Rectangle',
  'MapPopup',
  'FeatureGroup',
  'TileLayer',
  'PieChartMarkersLayer',
  'Polyline'
];

let FeatureGroup = React.createClass({

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
    let {children} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);

    return (
      <LeafletFeatureGroup
        children={children}
      />
    );
  }

});

export default FeatureGroup;
