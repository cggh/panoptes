import React from 'react';
import GoogleMap from 'google-map-react';
import {fitBounds} from 'google-map-react/utils';
import shallowEquals from 'shallow-equals';

// Lodash
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Utils
import DetectResize from 'utils/DetectResize';

function getMapOptions(maps) {
  return {
    zoomControlOptions: {
      position: maps.ControlPosition.RIGHT_BOTTOM,
      style: maps.ZoomControlStyle.SMALL
    },
    mapTypeControlOptions: {
      position: maps.ControlPosition.TOP_LEFT,
      StreetViewStatus: true
    },
    mapTypeControl: true
  };
}

let ItemMap = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.object,
    zoom: React.PropTypes.number,
    markers: React.PropTypes.array
  },

  getDefaultProps() {
    return {
      zoom: 1,
      center: {
        lat: 0,
        lng: 0
      }
    };
  },

  getInitialState() {
    return {
      width: 100, // FIXME: required for fitBounds but arbitrary value?
      height: 100 // FIXME: required for fitBounds but arbitrary value?
    };
  },

  handleGoogleApiLoaded({map, maps}) {
    //Here we need a force update the first time a map is loaded or markers don't show
    //We can't do this every time as handleGoogleApiLoaded is fired before onChange
    // https://github.com/istarkov/google-map-react/issues/73
    let oldMap = this.map;
    this.map = map;
    this.maps = maps;
    if (oldMap !== map) {
      this.forceUpdate();
    }
  },

  handleResize(size) {
    if (shallowEquals(size, this.state))
      return;
    let {map, maps} = this;
    this._googleMapRef._setViewSize();
    if (maps && map) {
      let center = map.getCenter();
      maps.event.trigger(map, 'resize');
      map.setCenter(center);
    }
    this.setState(size);
  },

  render() {
    let {center, zoom, markers} = this.props;
    let actions = this.getFlux().actions;

    // Remove previously rendered markers from the map.
    if (this.mapMarkers) {
      for (let i = 0, len = this.mapMarkers.length; i < len; i++) {
        this.mapMarkers[i].setMap(null);
      }
    }
    this.mapMarkers = [];

    if (markers.length == 1) {

      // If there is only one marker, then set the map's center to the coordinates of that marker.
      center = {lat: markers[0].lat, lng: markers[0].lng};
      zoom = 4;

      if (this.maps && this.map) {

        // Create a new marker at the given position.
        let mapMarker = new this.maps.Marker({
          position: {lat: markers[0].lat, lng: markers[0].lng},
          map: this.map,
          title: markers[0].title
        });

        mapMarker.addListener('click', () => actions.panoptes.dataItemPopup({table: markers[0].table, primKey: markers[0].primKey.toString()}));

        this.mapMarkers.push(mapMarker);
      }

    } else if (markers.length > 1) {

      // If there is more than one marker, then set the map's center and zoom to fit around them.

      // Derive the north-west and south-east boundaries from the coordinates of the markers.
      const bounds = {
        nw: {
          lat: _maxBy(markers, 'lat').lat,
          lng: _minBy(markers, 'lng').lng
        },
        se: {
          lat: _minBy(markers, 'lat').lat,
          lng: _maxBy(markers, 'lng').lng
        }
      };

      // Use the fitBounds util to derive the appropriate center and the zoom.
      ({center, zoom} = fitBounds(bounds, this.state));


      if (this.maps && this.map) {

        for (let i = 0, len = markers.length; i < len; i++) {

          if (markers[i].isHighlighted) {

            // Create a new marker at the given position.
            let mapMarker = new this.maps.Marker({
              position: {lat: markers[i].lat, lng: markers[i].lng},
              map: this.map,
              title: markers[i].title
            });

            mapMarker.addListener('click', () => actions.panoptes.dataItemPopup({table: markers[i].table, primKey: markers[i].primKey.toString()}));

            this.mapMarkers.push(mapMarker);

          } else {

            // Create a new marker at the given position.
            let mapMarker = new this.maps.Marker({
              position: {lat: markers[i].lat, lng: markers[i].lng},
              map: this.map,
              title: markers[i].title,
              icon: {
                path: this.maps.SymbolPath.CIRCLE,
                fillColor: '#F26C6C',
                fillOpacity: 1,
                scale: 4,
                strokeColor: '#BC0F0F',
                strokeWeight: 1
              }
            });

            mapMarker.addListener('click', () => actions.panoptes.dataItemPopup({table: markers[i].table, primKey: markers[i].primKey.toString()}));

            this.mapMarkers.push(mapMarker);

          }

        }

      }

    }

    // TODO: use an API key from config
    // <GoogleMap ...  bootstrapURLKeys={{key: 'AIza...example...1n8'}}
    return (
      <DetectResize onResize={this.handleResize}>
          <GoogleMap
            debounced={false}
            center={center}
            zoom={zoom}
            yesIWantToUseGoogleMapApiInternals={true}
            onGoogleApiLoaded={this.handleGoogleApiLoaded}
            options={getMapOptions}
            ref={(r) => this._googleMapRef = r}
          >
        </GoogleMap>
      </DetectResize>
  );

  }

});

module.exports = ItemMap;
