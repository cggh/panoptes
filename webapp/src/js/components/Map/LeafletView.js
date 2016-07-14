import React from 'react';
import {Map, Marker, Popup, TileLayer} from 'react-leaflet';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import DetectResize from 'utils/DetectResize';

// CSS
import 'leaflet.css';

// Lodash
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';

let MapLeafletView = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  getDefaultProps() {
    return {
      zoom: 1,
      center: {
        lat: 0,
        lng: 0
      }
    };
  },


  // Lifecycle methods
  componentWillUnmount() {
console.log('LeafletView componentWillUnmount this: %o', this);
console.log('LeafletView componentWillUnmount window.L: %o', window.L);
  },

  // Event handlers
  handleDetectResize() {
    this.refs.map.leafletElement.invalidateSize();
  },
  handleMarkerOnClick(e, payload) {
    let {table, primKey} = payload;
    this.getFlux().actions.panoptes.dataItemPopup({table, primKey});
  },

  render() {
    let {center, zoom, markers} = this.props;

    let L = window.L;
    let mapMarkers = undefined;
    let bounds = undefined;

    if (markers !== undefined) {

      if (markers.length >= 1) {

        let northWest = L.latLng(_maxBy(markers, 'lat').lat, _minBy(markers, 'lng').lng);
        let southEast = L.latLng(_minBy(markers, 'lat').lat, _maxBy(markers, 'lng').lng);

        bounds = L.latLngBounds(northWest, southEast);
      }

      mapMarkers = [];

      for (let i = 0, len = markers.length; i < len; i++) {

        // Create a new marker at the given position.

        // Give this marker a big icon if it isHighlighted or if there is only one marker.
        // Otherwise, give this marker a small icon.

        // path: this.maps.SymbolPath.CIRCLE,
        // fillColor: '#F26C6C',
        // fillOpacity: 1,
        // scale: 4,
        // strokeColor: '#BC0F0F',
        // strokeWeight: 1


        let icon = (markers[i].isHighlighted || len === 1) ? undefined : L.divIcon({html: '<span>hello</span>'});

        let mapMarker = (
          <Marker
            key={i}
            position={{lat: markers[i].lat, lng: markers[i].lng}}
            icon={icon}
            title={markers[i].title}
            onClick={(e) => this.handleMarkerOnClick(e, {table: markers[i].table, primKey: markers[i].primKey.toString()})}
          />
        );

        mapMarkers.push(mapMarker);

      }
    }

    const TileLayerUrl = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    const TileLayerAttribution = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <Map
          ref="map"
          center={center}
          zoom={zoom}
          style={{height: '100%', width: '100%'}}
          bounds={bounds}
        >
          <TileLayer
            url={TileLayerUrl}
            attribution={TileLayerAttribution}
          />
          {mapMarkers}
        </Map>
      </DetectResize>
    );

  }

});

module.exports = MapLeafletView;
