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
      width: 100,
      height: 100,
      bounds: null
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

  handleMapChange({center, zoom, bounds}) {
    if (this.props.onPanZoom) {
      this.props.onPanZoom({center, zoom});
    }
    this.setState({bounds});
  },

  render() {
    let {center, zoom, markers} = this.props;
    let {bounds} = this.state;
    let actions = this.getFlux().actions;

    //If no bounds have been set then clip to the markers.
    if (!bounds) {
      if (markers) {
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
        ({center, zoom} = fitBounds(bounds, this.state));
      } else {
        zoom = 1;
        center = {
          lat: 0,
          lng: 0
        };
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
            onChange={this.handleMapChange}
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
                  onClick={() => actions.panoptes.dataItemPopup({table: marker.locationTable, primKey: marker.locationPrimKey.toString()})}
                />
            )
          }
        </GoogleMap>
      </DetectResize>
  );

  }

});

module.exports = ItemMap;
