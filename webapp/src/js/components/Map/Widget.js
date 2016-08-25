import Immutable from 'immutable';
import {Map} from 'react-leaflet';
import React from 'react';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import DetectResize from 'utils/DetectResize';
import Loading from 'ui/Loading';
import TileLayerWidget from 'Map/TileLayer/Widget';

// Lodash
import _cloneDeep from 'lodash/cloneDeep';
import _isEqual from 'lodash/isEqual';
import _isFunction from 'lodash/isFunction';

// CSS
import 'leaflet/dist/leaflet.css';

/* TODO: Support

  <p>A layered map:</p>
  <div style="width:300px;height:300px">
  <Map center="[0, 0]" zoom="2"><LayersControl position="topright"><BaseLayer checked="true" name="OpenStreetMap.Mapnik"><TileLayer attribution="FIXME" url="http://{s}.tile.osm.org/{z}/{x}/{y}.png" /></BaseLayer><BaseLayer name="OpenStreetMap.BlackAndWhite"><FeatureGroup><TileLayer attribution="FIXME" url="http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png" /><FeatureGroup><Marker position="[0, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker><Marker position="[50, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker></FeatureGroup></FeatureGroup></BaseLayer><Overlay name="Markers with popups"><FeatureGroup><Marker position="[0, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker><Marker position="[50, 0]"><Popup><div><span>A pretty CSS3 popup. <br /> Easily customizable.</span></div></Popup></Marker></FeatureGroup></Overlay><Overlay checked="true" name="Layer group with circles"><FeatureGroup><Circle center="[0, 0]" fillColor="blue" radius="200" /><Circle center="[0, 0]" fillColor="red" radius="100" stroke="false" /><FeatureGroup><Circle center="[51.51, -0.08]" color="green" fillColor="green" radius="100" /></FeatureGroup></FeatureGroup></Overlay><Overlay name="Feature group"><FeatureGroup color="purple"><Popup><span>Popup in FeatureGroup</span></Popup><Circle center="[51.51, -0.06]" radius="200" /><Rectangle bounds="[[51.49, -0.08],[51.5, -0.06]]" /></FeatureGroup></Overlay></LayersControl></Map>
  </div>

*/


let MapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.array, React.PropTypes.object]),
    children: React.PropTypes.node,
    componentUpdate: React.PropTypes.func, // NB: session will not record {center, zoom} when widget is in templates
    tileLayerAttribution: React.PropTypes.string,
    tileLayerURL: React.PropTypes.string,
    title: React.PropTypes.string,
    zoom: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number])
  },

  childContextTypes: {
    crs: React.PropTypes.object,
    setBounds: React.PropTypes.func,
    setLoadStatus: React.PropTypes.func
  },

  title() {
    return this.props.title || 'Map';
  },

  getChildContext() {
    return {
      crs: this.map !== undefined ? this.map.leafletElement.options.crs : window.L.CRS.EPSG3857,
      setBounds: this.setBounds,
      setLoadStatus: this.setLoadStatus
    };
  },
  getDefaultProps() {
    return {
      center: [0, 0],
      zoom: 0,
      tileLayerAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      tileLayerURL: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
    };
  },
  getInitialState() {
    return {
      bounds: undefined,
      loadStatus: 'loaded'
    };
  },

  // Event handlers
  handleDetectResize() {
    if (this.map !== null) {
      this.map.leafletElement.invalidateSize();
    }
  },
  handleMapMoveEnd(e) {

    // NB: this event fires whenever the map's bounds, center or zoom change.
    // this.map is not available on the first render (it's a callback ref attached to the Map component; no DOM yet)
    // this.props.componentUpdate is not available when the widget is mounted via a template (when it's not session-bound)

    if (this.map !== null && this.props.componentUpdate !== undefined) {

      let leafletCenter = this.map.leafletElement.getCenter();
      let newCenter = Immutable.Map({lat: leafletCenter.lat, lng: leafletCenter.lng});
      let newZoom = this.map.leafletElement.getZoom();
console.log('oldCenter: ' + this.props.center);
console.log('newCenter: ' + newCenter);
console.log('oldZoom: ' + this.props.zoom);
console.log('newZoom: ' + newZoom);
      if (!_isEqual(newCenter, this.props.center) || newZoom !== this.props.zoom) {
console.log('componentUpdate');
        this.props.componentUpdate({center: newCenter, zoom: newZoom});
      }
    }
  },
  setBounds(bounds) {
    this.setState({bounds});
  },
  setLoadStatus(loadStatus) {
    this.setState({loadStatus});
  },

  render() {
    let {center, children, tileLayerAttribution, tileLayerURL, zoom} = this.props;
    let {bounds, loadStatus} = this.state;

    // NB: Widgets and their children should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    // TODO: Turn this into a class for all widgets.
    let widgetStyle = {height: '100%'};

    let adaptedMapProps = {};

    // Translate prop values from strings (used in templates)
    // into the required primitive types.

    // TODO: Could also support individual centerLat and centerLng props.

    if (center instanceof Array) {
      // TODO: check the array looks like [0, 0]
      adaptedMapProps.center = center;
    } else if (center !== null && typeof center === 'object') {
      // TODO: check the object looks like {lat: 50, lng: 30} or {lat: 50, lon: 30}
      if (center.lat !== undefined) {
        adaptedMapProps.center = center;
      } else if (_isFunction(center.get)) {
        // TODO: check the object is a Map
        adaptedMapProps.center = {lat: center.get('lat'), lng: center.get('lng')};
      } else {
        console.error('center is an unhandled object: %o', center);
      }
    } else if (typeof center === 'string') {
      // TODO: check the string looks like "[0, 0]" before trying to parse.
      let centerArrayFromString = JSON.parse(center);
      if (centerArrayFromString instanceof Array) {
        adaptedMapProps.center = centerArrayFromString;
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

    if (adaptedMapProps.center === undefined || adaptedMapProps.center === null) {
      console.error('MapWidget failed to determine center');
    }

    if (adaptedMapProps.zoom === undefined || adaptedMapProps.zoom === null) {
      console.error('MapWidget failed to determine zoom');
    }

    // NB: JSX children will overwrite the passed prop, if any.
    // https://github.com/facebook/flow/issues/1355

    // NB: The bounds prop on the react-leaftlet Map component is equivalent to fitBounds
    // There is also a boundsOptions prop corresponding to http://leafletjs.com/reference.html#map-fitboundsoptions
    // TODO: boundsOptions: {padding: [1, 1]},

    let commonMapProps = {
      bounds: bounds,
      onMoveEnd: (e) => this.handleMapMoveEnd(e),
      style: widgetStyle,
      ref: (ref) => this.map = ref
    };

    let mapComponent = null;

    // Provide a default tile layer.
    // Is there a situation where the user wants no tile layer?
    let defaultTileLayer = (
      <TileLayerWidget
        attribution={tileLayerAttribution}
        url={tileLayerURL}
      />
    );

    // TODO: Tidy up this logic.

    if (children.length) {

      // If children is iterable.

      // If the children are all MarkerWidgets, or only a FeatureGroup containing only MarkerWidgets, then insert the default TileLayer.

      let nonMarkerChildrenCount = 0;

      let childrenToInspect = children;

      if (children.length === 1 && children[0].type !== undefined && children[0].type.displayName === 'FeatureGroupWidget') {
        childrenToInspect = children[0].props.children;
      }

      for (let i = 0, len = childrenToInspect.length; i < len; i++) {
        if (children[0].type !== undefined && childrenToInspect[i].type.displayName !== 'MarkerWidget') {
          nonMarkerChildrenCount++;
        }
      }

      if (nonMarkerChildrenCount === 0) {

        // If there are only Markers as children.

        let keyedDefaultTileLayer = _cloneDeep(defaultTileLayer);
        let keyedChildren = _cloneDeep(children);

        keyedDefaultTileLayer.key = 0;
        keyedChildren[0].key = 1;

        mapComponent = (
          <Map
            {...commonMapProps}
            {...adaptedMapProps}
          >
            {keyedDefaultTileLayer}
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

      // Otherwise, children does not have a length property.

      if (children !== null && typeof children === 'object') {

        // If there is a single child.

        if (
          children.type !== undefined
          && children.type.displayName === 'LayersControlWidget'
          && children.props.children !== null
          && !children.props.children.length
          && typeof children.props.children === 'object'
          && children.props.children.type !== undefined
          && children.props.children.type.displayName === 'BaseLayerWidget'
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

        // Just show the default map with the default TileLayer

        mapComponent = (
          <Map
            {...commonMapProps}
            {...adaptedMapProps}
          >
            {defaultTileLayer}
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
