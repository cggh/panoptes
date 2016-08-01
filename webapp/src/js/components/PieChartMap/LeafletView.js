import React from 'react';
import ReactDOM from 'react-dom';
import {Map, Marker, Popup, TileLayer} from 'react-leaflet';
import DivIcon from 'react-leaflet-div-icon';
import Immutable from 'immutable';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import DetectResize from 'utils/DetectResize';
import GeoLayouter from 'utils/GeoLayouter';
import PieChartWidget from 'PieChart/Widget';
import {latlngToMercatorXY} from 'util/WebMercator';

// CSS
import 'leaflet.css';

// Lodash
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';

// Constants
const L = window.L;

let PieChartMapLeafletView = React.createClass({

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
  getInitialState() {
    return {
      bounds: undefined
    };
  },

  // Lifecycle methods
  componentWillReceiveProps(nextProps) {
    let {markers} = nextProps;
    let {bounds} = this.state;

    if (markers !== undefined && markers.size >= 1 && bounds === undefined) {

      // If we have markers but no bounds, then calculate the initial bounds using the markers.

      // Define two corners, in this case: northWest (nw), and southEast (se).

      // First as a simple object, to calculate piechart areas, etc.
      let markersJS = markers.toJS();
      let nw = {lat: _maxBy(markersJS, 'lat').lat, lng: _minBy(markersJS, 'lng').lng};
      let se = {lat: _minBy(markersJS, 'lat').lat, lng: _maxBy(markersJS, 'lng').lng};

      // Then as a Leaflet LatLng, required to automagically adjust the map's bounds.
      let northWestLatLng = L.latLng(nw.lat, nw.lng);
      let southEastLatLng = L.latLng(se.lat, se.lng);

      // This bounds object will be used as a prop for the Map component, where it will be used to adjust the map's actual bounds.
      let bounds = L.latLngBounds(northWestLatLng, southEastLatLng);

      this.setState({bounds});
    }
  },
  componentDidMount() {
    if (this.map) {
      this.map.leafletElement.on('moveend', (e) => {
        this.handleMapMove(e);
      });
    }
  },

  // Event handlers
  handleDetectResize() {
    if (this.map) {
      this.map.leafletElement.invalidateSize();
    }
  },
  // TODO: Distinguish between clicking on a piechart / marker and dragging on the map (dragging on a marker).
  handleClickMarker(e, marker) {
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    // TODO: when left click, focus dataItemPopup. When middleclick, maintain focus on this component.
    this.getFlux().actions.panoptes.dataItemPopup({table: marker.locationTable, primKey: marker.locationPrimKey.toString(), switchTo: !middleClick});
  },
  handleClickPieChart(e, marker) {
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (!middleClick) {
      e.stopPropagation();
    }
    this.getFlux().actions.panoptes.dataItemPopup({table: marker.locationTable, primKey: marker.locationPrimKey.toString(), switchTo: !middleClick});
  },
  handleMapMove(e) {

    // if (this.map) {
    //   this.setState({bounds: this.map.leafletElement.getBounds()});
    //   if (this.props.onPanZoom) {
    //     this.props.onPanZoom({center: this.map.leafletElement.getCenter(), zoom: this.map.leafletElement.getZoom()});
    //   }
    // }

  },

  render() {
    let {center, zoom, markers} = this.props;
    let {bounds} = this.state;

    if (markers !== undefined && markers.size >= 1 && bounds !== undefined) {

      // Now we have bounds we can set sensible radii.

      let nw = bounds.getNorthWest();
      let se = bounds.getSouthEast();

      // If the map starts to loop (wrap?), we need to correct the bounds,
      // so the piecharts don't get clipped.
      if (se.lng < nw.lng) {
        se.lng = 180, nw.lng = -180;
      }

      // Filter piecharts to those that fall within the bounds,
      // and work out the area of each piechart.
      // NB: This is in lat/lng, but we only need to be rough.
      let pieAreaSum = markers
        .filter(
          (marker) =>
              marker.get('lat') >= se.lat &&
              marker.get('lat') <= nw.lat &&
              marker.get('lng') >= nw.lng &&
              marker.get('lng') <= se.lng
        )
        .map(
          (marker) =>
            (marker.get('radius') * marker.get('radius') * 2 * Math.PI)
        )
        .reduce(
          (sum, val) =>
            (sum + val)
          , 0
        );

      if (pieAreaSum > 0) {
        nw = latlngToMercatorXY(nw);
        se = latlngToMercatorXY(se);
        let mapArea = (nw.y - se.y) * (se.x - nw.x);
        let factor = 0.01 * Math.sqrt(mapArea / pieAreaSum); // was 75 * ...
        this.lastFactor = factor;
      }

      if (this.lastFactor) {
        markers = markers.map((marker) => marker.set('radius', marker.get('radius') * this.lastFactor));
      } else {
        console.error('this.lastFactor: ' + this.lastFactor);
        markers = Immutable.List();
      }

    }

    // NB: this.map is not available on the first render.
    let crs = this.map ? this.map.leafletElement.options.crs : L.CRS.EPSG3857;

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <GeoLayouter nodes={markers}>
          {
            (renderNodes) =>
              <Map
                ref={(ref) => this.map = ref}
                center={center}
                zoom={zoom}
                style={{height: '100%', width: '100%'}}
                bounds={bounds}
              >
                <TileLayer
                  url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                />
                {
                  renderNodes.map(
                    (marker, index) => {

                      // FIXME: Workaround to hide the default icon.
                      let icon = L.divIcon({html: ''});

                      // NB: Using DivIcon so we can easily put JSX and React components in here, e.g. <HelloWorld msg="foobar "/>

                      return (
                        <Marker
                          key={index}
                          position={{lat: marker.lat, lng: marker.lng}}
                          title={marker.title}
                          onClick={(e) => this.handleClickMarker(e, marker)}
                          icon={icon}
                        >
                          <DivIcon position={{lat: marker.lat, lng: marker.lng}}>
                            <PieChartWidget
                              debounced={false}
                              lng={marker.lng}
                              lat={marker.lat}
                              originalLng={marker.originalNode.lng}
                              originalLat={marker.originalNode.lat}
                              key={index}
                              name={marker.name}
                              radius={marker.radius}
                              chartData={marker.chartData}
                              crs={crs}
                              onClick={(e) => this.handleClickPieChart(e, marker)}
                            />
                          </DivIcon>
                        </Marker>
                      );
                    }
                  )
                }
              </Map>
          }
        </GeoLayouter>
      </DetectResize>
    );

  }

});

module.exports = PieChartMapLeafletView;
