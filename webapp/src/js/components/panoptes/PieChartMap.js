const React = require('react');
const ImmutablePropTypes = require('react-immutable-proptypes');
const GoogleMap = require('google-map-react');
const {fitBounds} = require('google-map-react/utils');
const _minBy = require('lodash/minBy');
const _maxBy = require('lodash/maxBy');
const _each = require('lodash/each');
const shallowEquals = require('shallow-equals');

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
      height: 100
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
    if(shallowEquals(size, this.state))
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

  handleMapChange({center, zoom}) {
    if (this.props.onPanZoom) {
      this.props.onPanZoom({center, zoom});
    }
  },

  render() {
    let {center, zoom, markers} = this.props;
    center = center ? center.toObject() : null;

    let actions = this.getFlux().actions;
    //If no bounds have been set then clip to the pies.
    if (!center || !zoom) {
      if (markers && markers.size === 1) {
        zoom = 1;
        center = {
          lat: 0,
          lng: 0
        };
      } else if (markers && markers.size > 1) {
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

    //TODO Proper logic for single pie and radius scaling
    markers = markers.map((marker) => marker.set('radius',20));

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
