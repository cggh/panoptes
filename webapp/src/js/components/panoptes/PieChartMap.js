const React = require('react');
const GoogleMap = require('google-map-react');
const {fitBounds} = require('google-map-react/utils');
const _minBy = require('lodash/minBy');
const _maxBy = require('lodash/maxBy');
const _each = require('lodash/each');

// Utils
const GeoLayouter = require('utils/GeoLayouter');
const DetectResize = require('utils/DetectResize');
const {latlngToMercatorXY} = require('util/WebMercator');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');

// Panoptes components
const PieChart = require('panoptes/PieChart');

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
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.object,
    zoom: React.PropTypes.number,
    markers: React.PropTypes.array
  },

  getInitialState() {
    return {
      maps: null,
      map: null,
      width: 100,
      height: 100
    };
  },

  handleGoogleApiLoaded: function(map, maps) {
    this.setState({map: map, maps: maps});
  },

  handleResize: function(size) {
    let {map, maps} = this.state;

    this._googleMapRef._setViewSize();
    if (maps && map) {
      let center =  map.getCenter();
      maps.event.trigger(map, 'resize');
      map.setCenter(center);
    }
    this.setState(size);
  },

  onZoom: function() {
  },

  onChange: function() {
    console.log('onChange');
  },

  render() {
    let {center, zoom, markers} = this.props;
    let actions = this.getFlux().actions;

    //If no bunds have been set then clip to the pies.
    if (!center || !zoom) {
      if (markers && markers.length === 1) {
        zoom = 1;
        center = {
          lat: 0,
          lng: 0
        };
      } else if (markers && markers.length > 1) {
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

    //TODO Proper logic for single pie and radius scaling
    _each(markers, (marker) => marker.radius = 20);


    // TODO: use an API key from config
    // <GoogleMap ...  bootstrapURLKeys={{key: 'AIza...example...1n8'}}
    return (
      <GeoLayouter nodes={markers}>
      {
        (renderNodes) =>
          <DetectResize onResize={this.handleResize}>
            <GoogleMap
              center={center}
              zoom={zoom}
              yesIWantToUseGoogleMapApiInternals={true}
              onGoogleApiLoaded={this.handleGoogleApiLoaded}
              options={getMapOptions}
              ref={(r) => this._googleMapRef = r}
              onZoomAnimationEnd={this.onZoom}
              onChange={this.onChange}
            >
              {
                renderNodes.map(
                  (marker, index) =>
                    <PieChart
                      lng={marker.lng}
                      lat={marker.lat}
                      originalLng={marker.originalNode.lng}
                      originalLat={marker.originalNode.lat}
                      key={index}
                      name={marker.name}
                      radius={marker.radius}
                      chartData={marker.chartData}
                      onClick={() => actions.panoptes.dataItemPopup(marker.locationTable, marker.locationPrimKey.toString())}
                    />
                )
              }
            </GoogleMap>
          </DetectResize>
      }
      </GeoLayouter>
    );

  }

});

module.exports = PieChartMap;
