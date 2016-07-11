import React from 'react';
import {Map, Marker, Popup, TileLayer} from 'react-leaflet';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import DetectResize from 'utils/DetectResize';

// CSS
import 'leaflet.css';

let ItemMap = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  handleDetectResize(payload) {
    this.refs.map.leafletElement.invalidateSize();
  },

  render() {

    const center = [51.505, -0.09];
    const zoom = 13;
    const position = center;
    const url = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    const attribution = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <Map
          ref="map"
          center={center}
          zoom={zoom}
          style={{height: '100%', width: '100%'}}
        >
          <TileLayer
            url={url}
            attribution={attribution}
          />
          <Marker position={position}>
            <Popup>
              <span>A pretty CSS3 popup.<br/>Easily customizable.</span>
            </Popup>
          </Marker>
        </Map>
      </DetectResize>
    );

  }

});

module.exports = ItemMap;
