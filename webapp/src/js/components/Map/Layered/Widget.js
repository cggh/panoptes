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

console.log('LayeredMapWidget children (if from MapWidget wrapped in a LayeredMapMarkerLayer): %o', children);

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

<FeatureGroup>
  <Marker position={center2}>
    <Popup>
      <div>
        <span>A pretty CSS3 popup. <br /> Easily customizable.</span>
      </div>
    </Popup>
  </Marker>
</FeatureGroup>

*/


    // NB: Widgets should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <Map
          center={center}
          zoom={zoom}
          style={{height: '100%'}}
        >
          <MapLayers
            hideLayersControl={hideLayersControl}
            layersControlPosition={layersControlPosition}
          >
            {children}
          </MapLayers>
        </Map>
      </DetectResize>
    );

  }

});


let MapLayers = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    map: React.PropTypes.object,
    layerContainer: React.PropTypes.object,
    hideLayersControl: React.PropTypes.bool,
    layersControlPosition: React.PropTypes.string,
    children: React.PropTypes.node
  },

  render() {
console.log('MapLayers props: %o', this.props);

    // Supplied via the Map component
    let {map, layerContainer} = this.props;

    // Supplied via the LayeredMapWidget component
    let {hideLayersControl, layersControlPosition, children} = this.props;


    // FIXME:
    // https://github.com/PaulLeCam/react-leaflet/issues/73

    let mapLayers = null;

    let bases = [];
    let overlays = [];

    let basesAsGroup = null;
    let overlaysAsGroup = null;

    // TODO: support multiple bases (distinct from overlays)

    bases.push(
      <TileLayer
        key={bases.length}
        attribution='&copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
        map={map}
        layerContainer={layerContainer}
      />
    );

    if (bases.length > 1 && !hideLayersControl) {
      basesAsGroup = (
          <BaseLayer
            name="TODO: BaseLayer names"
            map={map}
            layerContainer={layerContainer}
          >
            {bases}
          </BaseLayer>
      );
    } else {
      basesAsGroup = bases;
    }

    if (children) {
      if (children.length) {
        // We have an array of children
        overlays = overlays.concat(children);
      } else {
        // We have one child, which might be a wrapper.
        overlays.push(children);
      }
    }

    if (overlays.length > 1 && !hideLayersControl) {
      overlaysAsGroup = (
        <Overlay
          name="TODO: Overlay names"
          map={map}
          layerContainer={layerContainer}
        >
          {overlays}
        </Overlay>
      );
    } else {
      overlaysAsGroup = overlays;
    }

    if (!hideLayersControl) {
console.log('Showing LayersControl');
      mapLayers = (
        <LayersControl
          position={layersControlPosition}
          map={map}
          layerContainer={layerContainer}
        >
          {basesAsGroup}
          {overlaysAsGroup}
        </LayersControl>
      );
    } else {
console.log('Hiding LayersControl');
      mapLayers = bases.concat(overlays);
    }

    // return (
    //   <Marker
    //     map={map} /* pass down to Marker */
    //     layerContainer={layerContainer} /* pass down to Marker */
    //     position={[51.505, -0.09]}
    //   />
    // );

    return mapLayers;
  }
});

module.exports = LayeredMapWidget;
