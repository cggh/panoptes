import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import {FeatureGroup as LeafletFeatureGroup} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

import filterChildren from 'util/filterChildren';

const ALLOWED_CHILDREN = [
  'MapControlComponent',
  'ComponentMarker',
  'TableMarkersLayer',
  'Marker',
  'Circle',
  'Rectangle',
  'MapPopup',
  'FeatureGroup',
  'TileLayer',
  'PieChartMarkersLayer',
  'Polyline',
  'GeoLayouter',
  'GeoJSON',
  'TableData',
  'TableGeoJSONsLayer',
  'HideLayerAtZoom'
];

let FeatureGroup = createReactClass({
  displayName: 'FeatureGroup',

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },

  propTypes: {
    children: PropTypes.node,
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },

  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
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
      <LeafletFeatureGroup>{children}</LeafletFeatureGroup>
    );
  },
});

export default FeatureGroup;
