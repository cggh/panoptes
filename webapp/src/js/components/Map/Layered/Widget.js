import React from 'react';
import {Map} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import DetectResize from 'utils/DetectResize';
import LayeredMapLayersControl from 'Map/Layered/LayersControl';

// CSS
import 'leaflet.css';

let LayeredMapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.object.isRequired,
    zoom: React.PropTypes.number.isRequired,
    title: React.PropTypes.string,
    hideLayersControl: React.PropTypes.bool,
    layersControlPosition: React.PropTypes.string,
    children: React.PropTypes.node
  },

  getDefaultProps() {
    return {
      center: {lat: 0, lng: 0},
      zoom: 1,
      hideLayersControl: false,
      layersControlPosition: 'topright'
    };
  },

  title() {
    return this.props.title;
  },

  // Event handlers
  handleDetectResize() {
    if (this.map) {
      this.map.leafletElement.invalidateSize();
    }
  },

  render() {
    let {center, zoom, hideLayersControl, layersControlPosition, children} = this.props;

    // NB: Widgets should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <Map
          center={center}
          zoom={zoom}
          style={{height: '100%'}}
        >
          <LayeredMapLayersControl
            hideLayersControl={hideLayersControl}
            layersControlPosition={layersControlPosition}
          >
            {children}
          </LayeredMapLayersControl>
        </Map>
      </DetectResize>
    );

  }

});

module.exports = LayeredMapWidget;
