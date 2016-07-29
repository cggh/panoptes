import React from 'react';
import {
  Map,
  Circle,
  FeatureGroup,
  LayersControl,
  Marker,
  Popup,
  Rectangle,
  TileLayer
} from 'react-leaflet';

const {BaseLayer, Overlay} = LayersControl;

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import DetectResize from 'utils/DetectResize';

// CSS
import 'leaflet.css';

let LayerMapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.object.isRequired,
    zoom: React.PropTypes.number.isRequired,
    title: React.PropTypes.string,
    hideLayersControl: React.PropTypes.bool,
    layersControlPosition: React.PropTypes.string,
    children: React.PropTypes.array
  },

  getDefaultProps() {
    return {
      center: {lat: 0, lng: 0},
      zoom: 0,
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


    const center2 = [50, 0];
/*

const rectangle = [
  [51.49, -0.08],
  [51.5, -0.06],
];

const center2 = [50, 0];

*/


/*

<LayersControl position={layersControlPosition}>
  <BaseLayer checked name="OpenStreetMap.Mapnik">
    <TileLayer
      attribution='&copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
    />
  </BaseLayer>
  <BaseLayer name="OpenStreetMap.BlackAndWhite">
    <FeatureGroup>
      <TileLayer
        attribution='&copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png"
      />
      <FeatureGroup>
        <Marker position={center}>
          <Popup>
            <div>
              <span>A pretty CSS3 popup. <br /> Easily customizable.</span>
              <HelloWorld msg="foobar" />
            </div>
          </Popup>
        </Marker>
        <Marker position={center2}>
          <Popup>
            <div>
              <span>A pretty CSS3 popup. <br /> Easily customizable.</span>
              <HelloWorld msg="foobar2" />
            </div>
          </Popup>
        </Marker>
      </FeatureGroup>
    </FeatureGroup>
  </BaseLayer>
  <Overlay name="Markers with popups">
    <FeatureGroup>
      <Marker position={center}>
        <Popup>
          <div>
            <span>A pretty CSS3 popup. <br /> Easily customizable.</span>
            <HelloWorld msg="foobar" />
          </div>
        </Popup>
      </Marker>
      <Marker position={center2}>
        <Popup>
          <div>
            <span>A pretty CSS3 popup. <br /> Easily customizable.</span>
            <HelloWorld msg="foobar2" />
          </div>
        </Popup>
      </Marker>
    </FeatureGroup>
  </Overlay>
  <Overlay checked name="Layer group with circles">
    <FeatureGroup>
      <Circle center={center} fillColor="blue" radius={200} />
      <Circle center={center} fillColor="red" radius={100} stroke={false} />
      <FeatureGroup>
        <Circle center={[51.51, -0.08]} color="green" fillColor="green" radius={100} />
      </FeatureGroup>
    </FeatureGroup>
  </Overlay>
  <Overlay name="Feature group">
    <FeatureGroup color="purple">
      <Popup>
        <span>Popup in FeatureGroup</span>
      </Popup>
      <Circle center={[51.51, -0.06]} radius={200} />
      <Rectangle bounds={rectangle} />
    </FeatureGroup>
  </Overlay>
</LayersControl>

*/

/*
<div><span>Map...</span><div style="width:300px;height:300px"><Map centerLat="1" centerLng="2" zoom="3" /></div></div>
<div><span>Map with Markers...</span><div style="width:300px;height:300px"><Map><MapMarker lat="0" lng="0" /><MapMarker lat="1" lng="1" /></Map></div></div>
*/

    let mapContents = null;

    let layers = [];

    layers.push(
      <TileLayer
        key={layers.length}
        attribution='&copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
      />
    );


console.log('LayerMapWidget children: %o', children);
    if (children) {
      //layers.concat(children);
    }

    if (layers.length > 1 && !hideLayersControl) {
      mapContents = <LayersControl key="0" position={layersControlPosition}>{layers}</LayersControl>;
    } else {
      mapContents = layers;
    }

    // NB: Widgets should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <Map
          center={center}
          zoom={zoom}
          style={{height: '100%'}}
        >
          {mapContents}
          <FeatureGroup>
            <Marker position={center2}>
              <Popup>
                <div>
                  <span>A pretty CSS3 popup. <br /> Easily customizable.</span>
                </div>
              </Popup>
            </Marker>
          </FeatureGroup>
        </Map>
      </DetectResize>
    );

  }

});

module.exports = LayerMapWidget;
