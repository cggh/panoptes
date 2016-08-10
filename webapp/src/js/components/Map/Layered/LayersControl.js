import React from 'react';
import {
  LayersControl,
  TileLayer
} from 'react-leaflet';

const {BaseLayer, Overlay} = LayersControl;

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Lodash
import _cloneDeep from 'lodash/cloneDeep';

let LayeredMapLayersControl = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    hideLayersControl: React.PropTypes.bool,
    layersControlPosition: React.PropTypes.string,
    children: React.PropTypes.node,
    map: React.PropTypes.object,
    layerContainer: React.PropTypes.object
  },

  render() {

    // Supplied via the Map component
    // NB: Becomes unnecessary in react-leaflet >= v0.12, but react-leaflet-div-icon is still on v0.11
    // https://github.com/PaulLeCam/react-leaflet/blob/v0.11.7/example/components/custom-component.js
    // https://github.com/PaulLeCam/react-leaflet/issues/73
    let {map, layerContainer} = this.props;

    // Supplied via the LayeredMapWidget component
    let {hideLayersControl, layersControlPosition, children} = this.props;

    let mapLayers = null;

    let bases = [];
    let overlays = [];

    let basesAsGroup = null;
    let overlaysAsGroup = null;

    // TODO: support multiple bases (distinct from overlays)
    // TODO: support multiple overlays (distinct from bases)
    // We currently only have one base layer and one overlay layer,
    // so there are no layers to switch off/on.
    //hideLayersControl = true;

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
console.log('LayersControl children array: %o', children);
        // We have an array of children
        let augmentedChildren = _cloneDeep(children);
        for (let i = 0, len = augmentedChildren.length; i < len; i++) {
          let augmentedChild = augmentedChildren[i];
          augmentedChild.key = i;
          augmentedChild.map = map;
          augmentedChild.layerContainer = layerContainer;
        }

        overlays = overlays.concat(augmentedChildren);
      } else {
console.log('LayersControl children single: %o', children);
        // We have one child, which might be a wrapper.

        let augmentedChild = _cloneDeep(children);
        augmentedChild.key = 0;
        augmentedChild.map = map;
        augmentedChild.layerContainer = layerContainer;

        overlays.push(augmentedChild);
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

    return mapLayers;
  }
});

module.exports = LayeredMapLayersControl;




/*

const rectangle = [
  [51.49, -0.08],
  [51.5, -0.06],
];

const center2 = [50, 0];

*/


/*

<LayersControl position="topright">
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
        <Marker position="[0, 0]">
          <Popup>
            <div>
              <span>A pretty CSS3 popup. <br /> Easily customizable.</span>
              <HelloWorld msg="foobar" />
            </div>
          </Popup>
        </Marker>
        <Marker position="[50, 0]">
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
      <Marker position="[0, 0]">
        <Popup>
          <div>
            <span>A pretty CSS3 popup. <br /> Easily customizable.</span>
            <HelloWorld msg="foobar" />
          </div>
        </Popup>
      </Marker>
      <Marker position="[50, 0]">
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
      <Circle center="[0, 0]" fillColor="blue" radius="200" />
      <Circle center="[0, 0]" fillColor="red" radius="100" stroke="false" />
      <FeatureGroup>
        <Circle center="[51.51, -0.08]" color="green" fillColor="green" radius="100" />
      </FeatureGroup>
    </FeatureGroup>
  </Overlay>
  <Overlay name="Feature group">
    <FeatureGroup color="purple">
      <Popup>
        <span>Popup in FeatureGroup</span>
      </Popup>
      <Circle center="[51.51, -0.06]" radius="200" />
      <Rectangle bounds="[[51.49, -0.08],[51.5, -0.06],]" />
    </FeatureGroup>
  </Overlay>
</LayersControl>

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
