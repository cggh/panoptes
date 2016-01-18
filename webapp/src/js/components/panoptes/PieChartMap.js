const React = require('react');
const GoogleMap = require('google-map-react');

// Utils
const GeoLayouter = require('utils/GeoLayouter');
const DetectResize = require('utils/DetectResize');

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
    center: React.PropTypes.object,
    zoom: React.PropTypes.number,
    markers: React.PropTypes.array
  },

  getInitialState() {
    return {
      maps: null,
      map: null,
      zoom: null
    };
  },

  onGoogleApiLoaded: function(map, maps) {
    this.setState({map: map, maps: maps, zoom: map.getZoom()});
  },

  onResize: function() {

    this._googleMapRef._setViewSize();

    if (this.state.maps && this.state.map) {
      let center =  this.state.map.getCenter();
      this.state.maps.event.trigger(this.state.map, 'resize');
      this.state.map.setCenter(center);
    }

  },

  onZoom: function() {
    this.setState({zoom: this.state.map.getZoom()});
  },

  onChange: function() {
    console.log('onChange');
  },

  render() {
    let {center, zoom, markers, residualFractionName, dataType, positionOffsetFraction} = this.props;

    // TODO: use an API key from config
    // <GoogleMap ...  bootstrapURLKeys={{key: 'AIza...example...1n8'}}

    let actions = this.getFlux().actions;

    return (
      <GeoLayouter
        initialNodes={markers}
        positionOffsetFraction={positionOffsetFraction}
        zoom={this.state.zoom}
        maps={this.state.maps}
        map={this.state.map}
      >
      {
        (renderNodes) => {
          return (
            <DetectResize onResize={this.onResize}>
              <GoogleMap
                center={center}
                zoom={zoom}
                yesIWantToUseGoogleMapApiInternals={true}
                onGoogleApiLoaded={({map, maps}) => this.onGoogleApiLoaded(map, maps)}
                options={getMapOptions}
                ref={(r) => this._googleMapRef = r}
                onZoomAnimationEnd={this.onZoom}
                onChange={this.onChange}
              >
                {
                  renderNodes.map(
                    function(marker, index) {
                      return (
                          <PieChart
                            lng={marker.lng}
                            lat={marker.lat}
                            key={index}
                            locationName={marker.locationName}
                            locationSize={marker.locationSize}
                            outerRadius={marker.radius}
                            residualFractionName={residualFractionName}
                            componentColumns={marker.componentColumns}
                            chartData={marker.chartData}
                            dataType={dataType}
                            onClick={() => actions.session.popupOpen('containers/DataItem', {table: marker.locationTable, primKey: marker.locationPrimKey.toString()})}
                          />
                      );
                    }
                  )
                }
              </GoogleMap>
            </DetectResize>
          );
        }
      }
      </GeoLayouter>
    );

  }

});

module.exports = PieChartMap;
