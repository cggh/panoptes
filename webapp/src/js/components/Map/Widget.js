import React from 'react';

import {
  Map, TileLayer
} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import DetectResize from 'utils/DetectResize';
import TileLayerWidget from 'Map/TileLayer/Widget';

// Lodash
import _cloneDeep from 'lodash/cloneDeep';

// Panoptes components
// import LayeredMapWidget from 'Map/Layered/Widget';
// import LayeredMapMarkerLayer from 'Map/Layered/MarkerLayer';

// CSS
import 'leaflet.css';

let MapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    tileLayerAttribution: React.PropTypes.string,
    tileLayerURL: React.PropTypes.string,
    center: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array]),
    children: React.PropTypes.array,
    title: React.PropTypes.string,
    zoom: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number])
  },

  title() {
    return this.props.title || 'Map';
  },

  getDefaultProps() {
    return {
      center: [0, 0],
      zoom: 0,
      tileLayerAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      tileLayerURL: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
    };
  },

  // Event handlers
  handleDetectResize() {
    if (this.map) {
      this.map.leafletElement.invalidateSize();
    }
  },

  render() {
    let {tileLayerAttribution, tileLayerURL, center, children, zoom} = this.props;

console.log('MapWidget props: %o', this.props);

    let adaptedProps = {};

    if (center instanceof Array) {
      adaptedProps.center = center;
    }
    if (typeof center === 'string') {
      // TODO: check the string looks like "[0, 0]" before trying to parse.
      let centerArrayFromString = JSON.parse(center);
      if (centerArrayFromString instanceof Array) {
        adaptedProps.center = centerArrayFromString;
      }
    }

    if (typeof zoom === 'number') {
      adaptedProps.zoom = zoom;
    }
    if (typeof zoom === 'string') {
      // TODO: check the string looks like "0" before trying to parse.
      let zoomNumberFromString = Number(zoom);
      if (typeof zoomNumberFromString === 'number') {
        adaptedProps.zoom = zoomNumberFromString;
      }
    }

    if (adaptedProps.center === undefined || adaptedProps.center === null) {
      console.error('MapWidget failed to determine center');
    }

    if (adaptedProps.zoom === undefined || adaptedProps.zoom === null) {
      console.error('MapWidget failed to determine zoom');
    }

    // NB: JSX children will overwrite the passed prop, if any.
    // https://github.com/facebook/flow/issues/1355

    // NB: Widgets should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    let commonProps = {
      style: {height: '100%'},
      ref: (ref) => this.map = ref
    };

    let mapWidgetComponent = null;

    let defaultTileLayer = (
      <TileLayerWidget
        attribution={tileLayerAttribution}
        url={tileLayerURL}
      />
    );

    if (children.length) {

      // If the children are all MarkerWidgets, or only a FeatureGroup containing only MarkerWidgets, then insert the default TileLayer.

      let nonMarkerChildrenCount = 0;

      let childrenToInspect = children;
      if (children.length === 1 && children[0].type.displayName === 'FeatureGroupWidget') {
        childrenToInspect = children[0].props.children;
      }

      for (let i = 0, len = childrenToInspect.length; i < len; i++) {
        if (childrenToInspect[i].type.displayName !== 'MarkerWidget') {
          nonMarkerChildrenCount++;
        }
      }

      if (nonMarkerChildrenCount === 0) {

        let keyedDefaultTileLayer = _cloneDeep(defaultTileLayer);
        let keyedChildren = _cloneDeep(children);

        keyedDefaultTileLayer.key = 0;
        keyedChildren[0].key = 1;

        mapWidgetComponent = (
          <Map
            {...commonProps}
            {...adaptedProps}
          >
            {keyedDefaultTileLayer}
            {keyedChildren}
          </Map>
        );

      } else {

        mapWidgetComponent = (
          <Map
            children={children}
            {...commonProps}
            {...adaptedProps}
          />
        );

      }

    } else {

      mapWidgetComponent = (
        <Map
          {...commonProps}
          {...adaptedProps}
        >
          {defaultTileLayer}
        </Map>
      );

    }

    return (
      <DetectResize onResize={this.handleDetectResize}>
        {mapWidgetComponent}
      </DetectResize>
    );

  }

});

module.exports = MapWidget;
