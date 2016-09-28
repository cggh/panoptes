import {Map} from 'react-leaflet';
import React from 'react';
import displayName from 'react-display-name';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

//Panoptes
import filterChildren from 'util/filterChildren';

// Panoptes components
import DetectResize from 'utils/DetectResize';
import Loading from 'ui/Loading';
import TileLayerWidget from 'Map/TileLayer/Widget';

// Lodash
import _cloneDeep from 'lodash/cloneDeep';
import _isArray from 'lodash/isArray';
import _isEqual from 'lodash/isEqual';
import _isObject from 'lodash/isObject';
import _isString from 'lodash/isString';
import _max from 'lodash/max';
import _min from 'lodash/min';

// CSS
// FIXME: leaflet/dist/leaflet.css
/*
ERROR in ./~/css-loader!./~/postcss-loader!./~/leaflet/dist/leaflet.css
Module not found: Error: Cannot resolve directory './images' in /[...]/panoptes/webapp/node_modules/leaflet/dist
 @ ./~/css-loader!./~/postcss-loader!./~/leaflet/dist/leaflet.css 6:8942-8962
*/
import 'leaflet-modified.css';

const ALLOWED_CHILDREN = [
  'LayersControlWidget',
  'TableMarkersLayerWidget',
  'TileLayerWidget',
  'FeatureGroupWidget',
  'MarkerWidget',
  'OverlayWidget'
];

/* To use maps in templates

  <p>A simple map:</p>
  <div style="width:300px;height:300px">
  <MapWidget />
  </div>

  <p>A map with a tilelayer and markers:</p>
  <div style="width:300px;height:300px">
  <Map center='{"lat":0,"lng":0}' zoom="4"><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /><Marker position="[2, -2.1]" /><Marker position="[0, 0]" /></Map>
  </div>

  <p>A map with two different base layers:</p>
  <div style="width:300px;height:300px">
  <Map center='{"lat":1,"lng":-1.1}' zoom="2"><LayersControl position="topright"><BaseLayer checked="true" name="OpenStreetMap.Mapnik"><TileLayer attribution="FIXME" url="http://{s}.tile.osm.org/{z}/{x}/{y}.png" /></BaseLayer><BaseLayer name="OpenStreetMap.BlackAndWhite"><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /></BaseLayer></LayersControl></Map>
  </div>

  <p>A map with two different base layers and two markers on one base layer:</p>
  <div style="width:300px;height:300px">
  <Map center='{"lat":1,"lng":-1.1}' zoom="4"><LayersControl position="topright"><BaseLayer checked="true" name="OpenStreetMap.Mapnik"><TileLayer attribution="FIXME" url="http://{s}.tile.osm.org/{z}/{x}/{y}.png" /></BaseLayer><BaseLayer name="OpenStreetMap.BlackAndWhite"><FeatureGroup><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /><Marker position="[2, -2.1]" /><Marker position="[0, 0]" /></FeatureGroup></BaseLayer></LayersControl></Map>
  </div>

  <p>A map with markers and popups:</p>
  <div style="width:300px;height:300px">
  <Map center='{"lat":1,"lng":-1.1}' zoom="4"><Marker position="[2, -2.1]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker><Marker position="[0, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker></Map>
  </div>

  <p>A map with markers from a table:</p>
  <div style="width:300px;height:300px">
  <Map><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /><TableMarkersLayer table="samplingsites" /></Map>
  </div>

  <p>A complex map:</p>
  <div style="width:300px;height:300px">
  <Map center='{"lat":1,"lng":-1.1}' zoom="2"><LayersControl position="topright"><BaseLayer checked="true" name="OpenStreetMap.Mapnik"><TileLayer attribution="FIXME" url="http://{s}.tile.osm.org/{z}/{x}/{y}.png" /></BaseLayer><BaseLayer name="OpenStreetMap.BlackAndWhite"><FeatureGroup><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /><FeatureGroup><Marker position="[0, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker><Marker position="[50, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker></FeatureGroup></FeatureGroup></BaseLayer><Overlay name="Sampling Sites"><TableMarkersLayer table="samplingsites" /></Overlay><Overlay checked="true" name="Layer group with circles"><FeatureGroup><Circle center="[0, 0]" fillColor="blue" radius="200" /><Circle center="[0, 0]" fillColor="red" radius="100" stroke="false" /><FeatureGroup><Circle center="[51.51, -0.08]" color="green" fillColor="green" radius="100" /></FeatureGroup></FeatureGroup></Overlay><Overlay name="Feature group"><FeatureGroup color="purple"><Popup><span>Popup in FeatureGroup</span></Popup><Circle center="[51.51, -0.06]" radius="200" /><Rectangle bounds="[[51.49, -0.08],[51.5, -0.06]]" /></FeatureGroup></Overlay></LayersControl></Map>
  </div>

*/


let MapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  // TODO: honour maxZoom and minZoom, e.g. Esri.DeLorme tile provider options.maxZoom

  propTypes: {
    center: React.PropTypes.object,
    children: React.PropTypes.node,
    setProps: React.PropTypes.func, // NB: session will not record {center, zoom} when widget is in templates
    onChange: React.PropTypes.func,
    title: React.PropTypes.string,
    zoom: React.PropTypes.number
  },
  childContextTypes: {
    crs: React.PropTypes.object,
    changeLayerStatus: React.PropTypes.func
  },

  getChildContext() {
    return {
      crs: (this.map !== undefined && this.map !== null) ? this.map.leafletElement.options.crs : window.L.CRS.EPSG3857,
      changeLayerStatus: this.handleChangeLayerStatus
    };
  },
  getDefaultProps() {
    // NB: Don't define a center or zoom here,
    // because render() relies on undefined to indicate that they have not already been set in the session (then decide a default).
    return {
      center: undefined,
      zoom: undefined
    };
  },
  getInitialState() {
    // NB: undefined is different to null in that bounds={undefined} will not be regarded as a specified (invalid) prop.
    return {
      bounds: undefined,
      loadStatus: 'loaded'
    };
  },

  // Event handlers
  handleChangeLayerStatus(payload) {

    let {loadStatus, bounds} = payload;

    if (this.state.bounds === undefined && bounds !== undefined)  {
      this.setState({bounds});

    } else if (this.state.bounds !== undefined && bounds !== undefined) {

      // Determine whether Map bounds need to be increased to accommodate new Layer bounds.

      let mapNorthEast = this.state.bounds.getNorthEast();
      let mapSouthWest = this.state.bounds.getSouthWest();
      let layerNorthEast = bounds.getNorthEast();
      let layerSouthWest = bounds.getSouthWest();

      let maxNorthEastLat = _max([mapNorthEast.lat, layerNorthEast.lat]);
      let maxNorthEastLng = _max([mapNorthEast.lng, layerNorthEast.lng]);
      let minSouthWestLat = _min([mapSouthWest.lat, layerSouthWest.lat]);
      let minSouthWestLng = _min([mapSouthWest.lng, layerSouthWest.lng]);

      if (
        maxNorthEastLat !== mapNorthEast.lat
        || maxNorthEastLng !== mapNorthEast.lng
        || minSouthWestLat !== mapSouthWest.lat
        || minSouthWestLng !== mapSouthWest.lng
      ) {
        let newSouthWest = window.L.latLng(minSouthWestLat, minSouthWestLng);
        let newNorthEast = window.L.latLng(maxNorthEastLat, maxNorthEastLng);
        let newBounds = window.L.latLngBounds(newSouthWest, newNorthEast);

        this.setState({bounds: newBounds});
      }

    }

    // TODO: spinner on map (allow map interaction while other layers load)
    this.setState({loadStatus});

  },
  handleDetectResize() {
    if (this.map !== null) {
      this.map.leafletElement.invalidateSize();
    }
  },
  handleMapMoveEnd(e) { // e is not being used

    // NB: this event fires whenever the map's bounds, center or zoom change.

    // this.map is not available on the first render; it's a callback ref attached to the Map component; no DOM yet.
    // However, this event, handleMapMoveEnd(e), will not be triggered on the first render.
    // Importantly, this.map is not available when the Map component is not visible, e.g. on an unselected tab.

    if (this.map !== null) {

      let leafletCenter = this.map.leafletElement.getCenter();
      let maxZoom = this.map.leafletElement.getMaxZoom();
      let newCenter = {lat: leafletCenter.lat, lng: leafletCenter.lng};
      let newZoom = this.map.leafletElement.getZoom();

      if (newZoom > maxZoom) {
        console.warn('Zooming beyond maxZoom:' + newZoom + '>' + maxZoom);
      }

      if (!_isEqual(newCenter, this.props.center) || newZoom !== this.props.zoom) {

        if (this.props.onChange !== undefined) {
          this.props.onChange({
            center: this.map.leafletElement.getCenter(),
            zoom: this.map.leafletElement.getZoom()
          });
        }

        // this.props.setProps is not available when the widget is mounted via a template (when it's not session-bound)
        // FIXME: this.props.setProps is not available when the widget is mounted through DataItem/Actions

        if (this.props.setProps !== undefined) {
          this.props.setProps({center: newCenter, zoom: newZoom});
        }

      }

    }

  },

  title() {
    return this.props.title || 'Map';
  },

  render() {
    let {center, children, zoom} = this.props;
    children = filterChildren(this, children, ALLOWED_CHILDREN);
    let {bounds, loadStatus} = this.state;

    // NB: The center/zoom props may have been set by the session or determined by bounds.
    if (bounds === undefined && center === undefined) {
      center = {lat: 0, lng: 0};
    }
    if (bounds === undefined && zoom === undefined) {
      zoom = 0;
    }

    // NB: Widgets and their children should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    // TODO: Turn this into a class for all widgets.
    let widgetStyle = {height: '100%'};

    // NB: JSX children will overwrite the passed prop, if any.
    // https://github.com/facebook/flow/issues/1355

    // NB: The bounds prop on the react-leaflet Map component is equivalent to fitBounds
    // There is also a boundsOptions prop corresponding to http://leafletjs.com/reference.html#map-fitboundsoptions
    // TODO: boundsOptions: {padding: [1, 1]},

    // NB: if bounds is undefined then it will not be regarded as a prop (and therefore not an invalid prop).
    let commonMapProps = {
      bounds: center && (zoom !== undefined) ? undefined : bounds,
      center: center,
      onMoveEnd: (e) => this.handleMapMoveEnd(e),
      style: widgetStyle,
      ref: (ref) => this.map = ref,
      zoom: zoom
    };

    let mapComponent = null;

    // TODO: Tidy up this logic. Maybe extract into functions?
    // Is similar logic needed elsewhere?

    if (children && children.length) {

      // If children is iterable and not empty (i.e. MapWidget has real children).

      // If the children are all MarkerWidgets, or only a FeatureGroup containing only MarkerWidgets, then insert the default TileLayer.

      let nonMarkerChildrenCount = 0;

      let childrenToInspect = children;

      if (children.length === 1 && children[0].type !== undefined && children[0].type.displayName === 'FeatureGroupWidget') {
        childrenToInspect = children[0].props.children;
      }

      let keyedChildren = [];

      for (let i = 0, len = childrenToInspect.length; i < len; i++) {
        if (childrenToInspect[0].type !== undefined && childrenToInspect[i].type.displayName !== 'MarkerWidget') {
          nonMarkerChildrenCount++;
        }
        keyedChildren[i] = _cloneDeep(childrenToInspect[i]);
        if (!_isString(keyedChildren[i])) {
          keyedChildren[i].key = i;
        }
      }

      if (nonMarkerChildrenCount === 0) {

        // If there are only Markers as children.

        mapComponent = (
          <Map
            {...commonMapProps}
            center={center}
            zoom={zoom}
          >
            <TileLayerWidget key="0" />
            {keyedChildren}
          </Map>
        );

      } else {

        // Otherwise, the children contain non-Markers
        // pass everything to the Map component.

        mapComponent = (
          <Map
            children={children}
            {...commonMapProps}
            center={center}
            zoom={zoom}
          />
        );

      }

    } else {

      // Otherwise, children either does not have a length property or it has a zero length property.

      if (
        _isObject(children) && !_isArray(children)
      ) {

        // If there is a child that is an object (and not an array).
        if (
          children && displayName(children.type) === 'LayersControlWidget'
          && _isObject(children.props.children) && !_isArray(children.props.children)
          && displayName(children.props.children.type) === 'BaseLayerWidget'
        ) {

          // If the child is a LayersControlWidget that only has a BaseLayerWidget child, then select that BaseLayer.

          let augmentedChild = _cloneDeep(children);
          augmentedChild.props.children.props.checked = true;
          mapComponent = (
            <Map
              children={augmentedChild}
              {...commonMapProps}
              center={center}
              zoom={zoom}
            />
          );

        } else {

          // Otherwise, pass everything to the Map component.

          mapComponent = (
            <Map
              children={children}
              {...commonMapProps}
              center={center}
              zoom={zoom}
            />
          );

        }


      } else {

        // MapWidget has no real children.
        // Just show the default map with the default TileLayer

        mapComponent = (
          <Map
            {...commonMapProps}
            center={center}
            zoom={zoom}
          >
            <TileLayerWidget />
          </Map>
        );

      }

    }

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <div style={widgetStyle}>
          <div style={widgetStyle}>
            {mapComponent}
          </div>
          <Loading status={loadStatus}/>
        </div>
      </DetectResize>
    );

  }

});

module.exports = MapWidget;
