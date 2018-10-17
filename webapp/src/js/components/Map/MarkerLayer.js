import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import FeatureGroup from 'Map/FeatureGroup';
import ComponentMarker from 'Map/ComponentMarker';
import filterChildren from 'util/filterChildren';
import MarkerLayerMarker from 'Map/MarkerLayerMarker';
import MarkerLayerPopup from 'Map/MarkerLayerPopup';
import _keys from 'lodash.keys';
import ForceLayouter from 'utils/ForceLayouter';
import OrderLayouter from 'utils/OrderLayouter';
import Polyline from 'Map/Polyline';
import _isArray from 'lodash.isarray';
import _values from 'lodash.values';

let MarkerLayer = createReactClass({
  displayName: 'MarkerLayer',

  propTypes: {
    layout: PropTypes.string,
    cluster: PropTypes.bool,
    children(props, propName, componentName) {
      // Only accept a two child, of the appropriate type
      let children = filterChildren(this, React.Children.toArray(props[propName]));
      if (!_isArray(children)) children = [children];
      let types = children.map((child) => child.type);
      if (types.length === 2) {
        if ((types[0] === MarkerLayerMarker && types[1] === MarkerLayerPopup) ||
            (types[1] === MarkerLayerMarker && types[0] === MarkerLayerPopup))
          return;
      }
      if (types.length === 1) {
        if (types[0] === MarkerLayerMarker ||
            types[0] === MarkerLayerPopup)
          return;
      }
      if (types.length === 0) {
        return;
      }
      return new Error(
        `${componentName} should have only MarkerLayerMarker and MarkerLayerPopup children, and at most one each.`
      );
    },
    fixedRadius: PropTypes.number,
  },

  render() {
    let {layout, children, cluster, fixedRadius, ...data} = this.props;
    children = filterChildren(this, React.Children.toArray(children));
    if (!_isArray(children)) {
      children = [children];
    }
    let childrenByType = {};
    children.forEach((child) => childrenByType[child.type.displayName] = child);
    let rows = [];
    let columns = _keys(data);
    if (cluster) {
      let clusters = {};
      for (let i = 0; i < data[columns[0]].length; i++) {
        if (clusters['' + data['lat'][i] + data['lng'][i]]) {
          let cluster = clusters['' + data['lat'][i] + data['lng'][i]];
          columns.forEach((column) => column === 'lat' || column === 'lng' || column === 'radius'  || column === 'area' ? null : cluster[column].push(data[column][i]));
          cluster.lat = data['lat'][i];
          cluster.lng = data['lng'][i];
          if (cluster.radius) {
            cluster.radius += data['radius'][i];
          }
          if (cluster.area) {
            cluster.area += data['area'][i];
          }
        } else {
          let cluster = {};
          columns.forEach((column) => cluster[column] = [data[column][i]]);
          cluster.lat = data['lat'][i];
          cluster.lng = data['lng'][i];
          if (cluster.radius) {
            cluster.radius = data['radius'][i];
          }
          if (cluster.area) {
            cluster.area = data['area'][i];
          }
          cluster.key = '' + data['lat'][i] + data['lng'][i];
          clusters['' + data['lat'][i] + data['lng'][i]] = cluster;
        }
      }
      rows = _values(clusters);
    } else {
      for (let i = 0; i < data[columns[0]].length; i++) {
        let row = {};
        columns.forEach((id) => row[id] = data[id][i]);
        row.key = row.primKey;
        rows.push(row);
      }
    }
    rows.forEach((row) => {
      if (row.area !== undefined && row.radius === undefined) {
        row.radius = Math.sqrt(row.area / Math.PI);
      }
    });
    let marker = (row) => null;
    if (childrenByType['MarkerLayerMarker'] && childrenByType['MarkerLayerMarker'].props.children) {
      marker = (row) => React.cloneElement(filterChildren(this, childrenByType['MarkerLayerMarker'].props.children), {radius: fixedRadius, ...row});
    }
    let popup = (row) => null;
    if (childrenByType['MarkerLayerPopup'] && childrenByType['MarkerLayerPopup'].props.children) {
      popup = (row) => React.cloneElement(filterChildren(this, childrenByType['MarkerLayerPopup'].props.children), {radius: fixedRadius, ...row});
    }
    return <FeatureGroup>{
      React.createElement(layout === 'force' ? ForceLayouter : OrderLayouter, {nodes: rows},
        (renderNodes) =>
          <FeatureGroup>
            {
              renderNodes.map(
                (markerData, i) =>
                  <ComponentMarker
                    key={`ComponentMarker_${i}`}
                    position={{lat: markerData.lat, lng: markerData.lng}}
                    zIndexOffset={i * 1000} //https://github.com/Leaflet/Leaflet/issues/5560
                    popup={popup(markerData)}
                  >
                    {marker(markerData)}
                  </ComponentMarker>
              ).concat(renderNodes.map(
                (markerData, i) =>
                  <Polyline
                    className="panoptes-table-markers-layer-polyline"
                    key={`Polyline_${i}`}
                    positions={[[markerData.lat, markerData.lng], [markerData.fixedNode.lat, markerData.fixedNode.lng]]}
                  />
              ))}
          </FeatureGroup>
      )}
    </FeatureGroup>;
  }
});

export default MarkerLayer;
