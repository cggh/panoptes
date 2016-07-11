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

  getDefaultProps() {
    return {
      zoom: 1,
      center: {
        lat: 0,
        lng: 0
      }
    };
  },


  // Event handlers

  handleDetectResize(payload) {
    this.refs.map.leafletElement.invalidateSize();
  },

  render() {
    let {center, zoom, markers} = this.props;

    // TODO: let actions = this.getFlux().actions;

    let mapMarkers = [];

    if (markers.length == 1) {

      // If there is only one marker,
      // then set the map's center to the coordinates of that marker,
      // and zoom in.
      center = {lat: markers[0].lat, lng: markers[0].lng};
      zoom = 4;
    }

    for (let i = 0, len = markers.length; i < len; i++) {

      // Create a new marker at the given position.

      // TODO: NOT isHighlighted
      // icon: {
      //   path: this.maps.SymbolPath.CIRCLE,
      //   fillColor: '#F26C6C',
      //   fillOpacity: 1,
      //   scale: 4,
      //   strokeColor: '#BC0F0F',
      //   strokeWeight: 1
      // }

      let mapMarker = (
        <Marker
          key={i}
          position={{lat: markers[i].lat, lng: markers[i].lng}}
          isHighlighted={markers[i].isHighlighted}
        >
          <Popup>
            <span>{markers[i].title}</span>
          </Popup>
        </Marker>
      );

      // TODO: mapMarker.addListener('click', () => actions.panoptes.dataItemPopup({table: markers[i].table, primKey: markers[i].primKey.toString()}));

      mapMarkers.push(mapMarker);

    }

    const TileLayerUrl = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    const TileLayerAttribution = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

    // TODO: Shorten Map height by height of top-bar.

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <Map
          ref="map"
          center={center}
          zoom={zoom}
          style={{height: '100%', width: '100%'}}
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

module.exports = ItemMap;
