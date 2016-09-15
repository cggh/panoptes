import React from 'react';

import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
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
import _isFunction from 'lodash/isFunction';
import _isObject from 'lodash/isObject';
import _isString from 'lodash/isString';
import _max from 'lodash/max';
import _min from 'lodash/min';

// CSS
import 'leaflet/dist/leaflet.css';

const ALLOWED_CHILDREN = [
  'LayersControlWidget',
  'TileLayerWidget',
  'FeatureGroupWidget',
  'MarkerWidget',
  'OverlayWidget',
];

/* To use maps in templates

  <p>A simple map:</p>
  <div style="width:300px;height:300px">
  <Map center="[1, -1.1]" zoom="2" />
  </div>

  <p>A map with a tilelayer and markers:</p>
  <div style="width:300px;height:300px">
  <Map center="[0, 0]" zoom="4"><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /><Marker position="[2, -2.1]" /><Marker position="[0, 0]" /></Map>
  </div>

  <p>A map with two different base layers:</p>
  <div style="width:300px;height:300px">
  <Map center="[1, -1.1]" zoom="2"><LayersControl position="topright"><BaseLayer checked="true" name="OpenStreetMap.Mapnik"><TileLayer attribution="FIXME" url="http://{s}.tile.osm.org/{z}/{x}/{y}.png" /></BaseLayer><BaseLayer name="OpenStreetMap.BlackAndWhite"><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /></BaseLayer></LayersControl></Map>
  </div>

  <p>A map with two different base layers and two markers on one base layer:</p>
  <div style="width:300px;height:300px">
  <Map center="[0, 0]" zoom="4"><LayersControl position="topright"><BaseLayer checked="true" name="OpenStreetMap.Mapnik"><TileLayer attribution="FIXME" url="http://{s}.tile.osm.org/{z}/{x}/{y}.png" /></BaseLayer><BaseLayer name="OpenStreetMap.BlackAndWhite"><FeatureGroup><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /><Marker position="[2, -2.1]" /><Marker position="[0, 0]" /></FeatureGroup></BaseLayer></LayersControl></Map>
  </div>

  <p>A map with markers and popups:</p>
  <div style="width:300px;height:300px">
  <Map center="[0, 0]" zoom="4"><Marker position="[2, -2.1]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker><Marker position="[0, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker></Map>
  </div>

  <p>A map with markers from a table:</p>
  <div style="width:300px;height:300px">
  <Map><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /><TableMarkersLayer table="samplingsites" /></Map>
  </div>

  <p>A complex map:</p>
  <div style="width:300px;height:300px">
  <Map center="[1, -1.1]" zoom="2"><LayersControl position="topright"><BaseLayer checked="true" name="OpenStreetMap.Mapnik"><TileLayer attribution="FIXME" url="http://{s}.tile.osm.org/{z}/{x}/{y}.png" /></BaseLayer><BaseLayer name="OpenStreetMap.BlackAndWhite"><FeatureGroup><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /><FeatureGroup><Marker position="[0, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker><Marker position="[50, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker></FeatureGroup></FeatureGroup></BaseLayer><Overlay name="Sampling Sites"><TableMarkersLayer table="samplingsites" /></Overlay><Overlay checked="true" name="Layer group with circles"><FeatureGroup><Circle center="[0, 0]" fillColor="blue" radius="200" /><Circle center="[0, 0]" fillColor="red" radius="100" stroke="false" /><FeatureGroup><Circle center="[51.51, -0.08]" color="green" fillColor="green" radius="100" /></FeatureGroup></FeatureGroup></Overlay><Overlay name="Feature group"><FeatureGroup color="purple"><Popup><span>Popup in FeatureGroup</span></Popup><Circle center="[51.51, -0.06]" radius="200" /><Rectangle bounds="[[51.49, -0.08],[51.5, -0.06]]" /></FeatureGroup></Overlay></LayersControl></Map>
  </div>

*/


let MapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  // TODO: honour maxZoom and minZoom, e.g. Esri.DeLorme tile provider options.maxZoom

  propTypes: {
    center: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array, React.PropTypes.object]),
    children: React.PropTypes.node,
    componentUpdate: React.PropTypes.func, // NB: session will not record {center, zoom} when widget is in templates
    onChange: React.PropTypes.func,
    tileLayerProps: React.PropTypes.oneOfType([React.PropTypes.string, ImmutablePropTypes.map]),
    title: React.PropTypes.string,
    zoom: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number])
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
      let newCenter = Immutable.Map({lat: leafletCenter.lat, lng: leafletCenter.lng});
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

        // this.props.componentUpdate is not available when the widget is mounted via a template (when it's not session-bound)
        // FIXME: this.props.componentUpdate is not available when the widget is mounted through DataItem/Actions

        if (this.props.componentUpdate !== undefined) {
          this.props.componentUpdate({center: newCenter, zoom: newZoom});
        }

      }

    }

  },

  title() {
    return this.props.title || 'Map';
  },

  render() {
    let {center, children, tileLayerProps, zoom} = this.props;
    children = filterChildren(this, ALLOWED_CHILDREN, children);
    let {bounds, loadStatus} = this.state;

    if (bounds === undefined && center === undefined && zoom === undefined) {
      // NB: The center/zoom props may have been set by the session or determined by bounds.
      center = [0, 0];
      zoom = 0;
    }

    // NB: Widgets and their children should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    // TODO: Turn this into a class for all widgets.
    let widgetStyle = {height: '100%'};

    let adaptedMapProps = {};
    let adaptedTileLayerProps = Immutable.Map();

    // Translate prop values from strings (used in templates)
    // into the required primitive types.

    // TODO: Could also support individual centerLat and centerLng props.

    if (center instanceof Array) {
      // TODO: check the array looks like [0, 0]
      adaptedMapProps.center = center;
    } else if (center !== undefined && typeof center === 'object') {
      // TODO: check the object looks like {lat: 50, lng: 30} or {lat: 50, lon: 30}
      if (center.lat !== undefined) {
        adaptedMapProps.center = center;
      } else if (_isFunction(center.get)) {
        // TODO: check the object is a Map
        adaptedMapProps.center = {lat: center.get('lat'), lng: center.get('lng')};
      } else {
        console.error('center is an unhandled object: %o', center);
      }
    } else if (center !== undefined && typeof center === 'string') {
      // TODO: check the string looks like "[0, 0]" before trying to parse.
      let centerArrayFromString = JSON.parse(center);
      if (centerArrayFromString instanceof Array) {
        adaptedMapProps.center = centerArrayFromString;
      }
    }

    if (tileLayerProps !== undefined && typeof tileLayerProps === 'object') {
      // TODO: check the object looks right before accepting it
      adaptedTileLayerProps = tileLayerProps;
    } else if (tileLayerProps !== undefined && typeof tileLayerProps === 'string') {
      // TODO: check the string looks right before trying to parse
      let tileLayerPropsFromString = Immutable.fromJS(JSON.parse(tileLayerProps));
      if (typeof tileLayerPropsFromString === 'object') {
        adaptedTileLayerProps = tileLayerPropsFromString;
      }
    }

    if (typeof zoom === 'number') {
      adaptedMapProps.zoom = zoom;
    } else if (typeof zoom === 'string') {
      // TODO: check the string looks like "0" before trying to parse.
      let zoomNumberFromString = Number(zoom);
      if (typeof zoomNumberFromString === 'number') {
        adaptedMapProps.zoom = zoomNumberFromString;
      }
    }

    if (bounds === undefined && (adaptedMapProps.center === undefined || adaptedMapProps.center === null)) {
      console.error('MapWidget failed to determine center or bounds');
    }

    if (bounds === undefined && (adaptedMapProps.zoom === undefined || adaptedMapProps.zoom === null)) {
      console.error('MapWidget failed to determine zoom or bounds');
    }

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
            {...adaptedMapProps}
          >
            <TileLayerWidget key="0" {...adaptedTileLayerProps.toObject()} />
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
            {...adaptedMapProps}
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
          && _isObject(children.props.children) && !isArray(children.props.children)
          && displayName(children.props.children.type) === 'BaseLayerWidget'
        ) {

          // If the child is a LayersControlWidget that only has a BaseLayerWidget child, then select that BaseLayer.

          let augmentedChild = _cloneDeep(children);
          augmentedChild.props.children.props.checked = true;
          mapComponent = (
            <Map
              children={augmentedChild}
              {...commonMapProps}
              {...adaptedMapProps}
            />
          );

        } else {

          // Otherwise, pass everything to the Map component.

          mapComponent = (
            <Map
              children={children}
              {...commonMapProps}
              {...adaptedMapProps}
            />
          );

        }


      } else {

        // MapWidget has no real children.
        // Just show the default map with the default TileLayer

        mapComponent = (
          <Map
            {...commonMapProps}
            {...adaptedMapProps}
          >
            <TileLayerWidget {...adaptedTileLayerProps.toObject()} />
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
