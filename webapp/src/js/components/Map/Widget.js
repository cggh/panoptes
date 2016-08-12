import React from 'react';

import {Map} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import DetectResize from 'utils/DetectResize';
import Loading from 'ui/Loading';
import TileLayerWidget from 'Map/TileLayer/Widget';


// Lodash
import _cloneDeep from 'lodash/cloneDeep';

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
    children: React.PropTypes.node,
    title: React.PropTypes.string,
    zoom: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number])
  },

  childContextTypes: {
    onChangeBounds: React.PropTypes.func,
    onChangeLoadStatus: React.PropTypes.func
  },

  title() {
    return this.props.title || 'Map';
  },

  getChildContext() {
    return {
      onChangeBounds: this.handleChangeBounds,
      onChangeLoadStatus: this.handleChangeLoadStatus
    };
  },
  getDefaultProps() {
    return {
      center: [0, 0],
      zoom: 0,
      tileLayerAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      tileLayerURL: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
    };
  },
  getInitialState() {
    return {
      bounds: undefined,
      loadStatus: 'loaded'
    };
  },

  // Event handlers
  handleChangeBounds(bounds) {
    this.setState({bounds});
  },
  handleChangeLoadStatus(loadStatus) {
    this.setState({loadStatus});
  },
  handleDetectResize() {
    if (this.map) {
      this.map.leafletElement.invalidateSize();
    }
  },

  render() {
    let {tileLayerAttribution, tileLayerURL, center, children, zoom} = this.props;
    let {bounds, loadStatus} = this.state;

    // NB: Widgets and their children should always fill their container's height, i.e.  style={{height: '100%'}}. Width will fill automatically.
    // TODO: Turn this into a class for all widgets.
    let widgetStyle = {height: '100%'};

    let adaptedMapProps = {};

    // Translate prop values from strings (used in templates)
    // into the required primitive types.

    // TODO: Could also support centerLat and centerLng props.

    if (center instanceof Array) {
      adaptedMapProps.center = center;
    }
    if (typeof center === 'string') {
      // TODO: check the string looks like "[0, 0]" before trying to parse.
      let centerArrayFromString = JSON.parse(center);
      if (centerArrayFromString instanceof Array) {
        adaptedMapProps.center = centerArrayFromString;
      }
    }

    if (typeof zoom === 'number') {
      adaptedMapProps.zoom = zoom;
    }
    if (typeof zoom === 'string') {
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


    let commonMapProps = {
      bounds: bounds,
      style: widgetStyle,
      ref: (ref) => this.map = ref
    };

    let mapWidgetComponent = null;

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
      if (children.length === 1 && children[0].type.displayName === 'FeatureGroupWidget') {
        childrenToInspect = children[0].props.children;
      }

      for (let i = 0, len = childrenToInspect.length; i < len; i++) {
        if (childrenToInspect[i].type.displayName !== 'MarkerWidget') {
          nonMarkerChildrenCount++;
        }
      }

      if (nonMarkerChildrenCount === 0) {

        // If there are only Markers as children.

        let keyedDefaultTileLayer = _cloneDeep(defaultTileLayer);
        let keyedChildren = _cloneDeep(children);

        keyedDefaultTileLayer.key = 0;
        keyedChildren[0].key = 1;

        mapWidgetComponent = (
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

        mapWidgetComponent = (
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
          children.type.displayName === 'LayersControlWidget'
          && children.props.children !== null
          && !children.props.children.length
          && typeof children.props.children === 'object'
          && children.props.children.type.displayName === 'BaseLayerWidget'
        ) {

          // If the child is a LayersControlWidget that only has a BaseLayerWidget child, then select that BaseLayer.

          let augmentedChild = _cloneDeep(children);
          augmentedChild.props.children.props.checked = true;
          mapWidgetComponent = (
            <Map
              children={augmentedChild}
              {...commonMapProps}
              {...adaptedMapProps}
            />
          );

        } else {

          // Otherwise, pass everything to the Map component.

          mapWidgetComponent = (
            <Map
              children={children}
              {...commonMapProps}
              {...adaptedMapProps}
            />
          );

        }


      } else {

        // Just show the default map with the default TileLayer

        mapWidgetComponent = (
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
          {mapWidgetComponent}
          <Loading status={loadStatus}/>
        </div>
      </DetectResize>
    );

  }

});

module.exports = MapWidget;
