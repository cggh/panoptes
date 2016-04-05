import React from 'react';
import GoogleMap from 'google-map-react';
import {fitBounds} from 'google-map-react/utils';
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';
import shallowEquals from 'shallow-equals';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import GeoMarker from 'panoptes/GeoMarker';

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
    let {center, zoom, markers, highlight} = this.props;
    let actions = this.getFlux().actions;

    if (!center || !zoom) {

      if (markers.length == 1) {

        // If there is only one marker, then set the map's center to the coordinates of that marker.
        center = {lat: markers[0].lat, lng: markers[0].lng};
        zoom = 4;

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
          {
            markers.map(
              (marker, index) =>
                <GeoMarker
                  debounced={false}
                  lng={marker.lng}
                  lat={marker.lat}
                  key={index}
                  title={marker.title}
                  onClick={() => actions.panoptes.dataItemPopup({table: marker.table, primKey: marker.primKey.toString()})}
                  isHighlighted={marker.isHighlighted}
                />
            )
          }
        </GoogleMap>
      </DetectResize>
  );

  }

});

module.exports = ItemMap;
