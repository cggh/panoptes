import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Immutable from 'immutable';
import GoogleMap from 'google-map-react';
import {fitBounds} from 'google-map-react/utils';
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';
import shallowEquals from 'shallow-equals';

// Utils
import GeoLayouter from 'utils/GeoLayouter';
import DetectResize from 'utils/DetectResize';
import {latlngToMercatorXY} from 'util/WebMercator';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import PieChart from 'panoptes/PieChart';

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

let PieChartMap = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    center: ImmutablePropTypes.contains({
      lat: React.PropTypes.number.isRequired,
      lng: React.PropTypes.number.isRequired
    }),
    zoom: React.PropTypes.number,
    markers: ImmutablePropTypes.list,
    onPanZoom: React.PropTypes.func
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
    center = center ? center.toObject() : null;
    let actions = this.getFlux().actions;

    //If no bounds have been set then clip to the pies.
    if (!bounds) {
      if (markers) {
        let markersJS = markers.toJS();
        const bounds = {
          nw: {
            lat: _maxBy(markersJS, 'lat').lat,
            lng: _minBy(markersJS, 'lng').lng
          },
          se: {
            lat: _minBy(markersJS, 'lat').lat,
            lng: _maxBy(markersJS, 'lng').lng
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

    if (bounds && markers.size > 0) {
      //Now we have bounds we can set some sensible radii
      //Filter pies to those in bounds and work out their area (I know this is in lat/lng, but we only need to be rough.
      let {nw, se} = bounds;
      //if the map starts to loop we need to correct the bounds so things don't get clipped
      if (se.lng < nw.lng)
        se.lng = 180, nw.lng = -180;
      let pieAreaSum = markers.filter((marker) =>
        marker.get('lat') > se.lat &&
        marker.get('lat') < nw.lat &&
        marker.get('lng') > nw.lng &&
        marker.get('lng') < se.lng)
        .map((marker) => marker.get('radius') * marker.get('radius') * 2 * Math.PI)
        .reduce((sum, val) => sum + val, 0);
      if (pieAreaSum > 0) {
        nw = latlngToMercatorXY(nw);
        se = latlngToMercatorXY(se);
        let mapArea = (nw.y - se.y) * (se.x - nw.x);
        let factor = 75 * Math.sqrt(mapArea / pieAreaSum);
        this.lastFactor = factor;
      }
      if (this.lastFactor)
        markers = markers.map((marker) => marker.set('radius', marker.get('radius') * this.lastFactor));
      else
        markers = Immutable.List();
    } else {
      markers = Immutable.List();
    }


    // TODO: use an API key from config
    // <GoogleMap ...  bootstrapURLKeys={{key: 'AIza...example...1n8'}}
    return (
      <DetectResize onResize={this.handleResize}>
        <GeoLayouter nodes={markers}>
          {
            (renderNodes) =>
              <GoogleMap
                debounced={false}
                center={center}
                zoom={zoom}
                yesIWantToUseGoogleMapApiInternals={true}
                onGoogleApiLoaded={this.handleGoogleApiLoaded}
                options={getMapOptions}
                ref={(r) => this._googleMapRef = r}
                onChange={this.handleMapChange}
                onDrag={this.handleDrag}
              >
                {
                  renderNodes.map(
                    (marker, index) =>
                      <PieChart
                        debounced={false}
                        lng={marker.lng}
                        lat={marker.lat}
                        originalLng={marker.originalNode.lng}
                        originalLat={marker.originalNode.lat}
                        key={index}
                        name={marker.name}
                        radius={marker.radius}
                        chartData={marker.chartData}
                        onClick={() => actions.panoptes.dataItemPopup({table: marker.locationTable,
                                primKey: marker.locationPrimKey.toString()})}
                      />
                  )
                }
              </GoogleMap>

          }
        </GeoLayouter>
      </DetectResize>
    );

  }

});

module.exports = PieChartMap;
