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

  // Event handlers
  handleDetectResize() {
    if (this.refs.map) {
      this.refs.map.leafletElement.invalidateSize();
    }
  },
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

  render() {
    let {center, zoom, markers} = this.props;

    let bounds = undefined;

    if (markers !== undefined && markers.size >= 1 && this.map !== undefined) {


      let markersJS = markers.toJS();

console.log('this.map: %o', this.map);

      //// Define two corners, in this case: northWest (nw), and southEast (se).

      // First as a simple object, to calculate piechart areas, etc.
      let nw = {lat: _maxBy(markersJS, 'lat').lat, lng: _minBy(markersJS, 'lng').lng};
      let se = {lat: _minBy(markersJS, 'lat').lat, lng: _maxBy(markersJS, 'lng').lng};

      // Then as a Leaflet LatLng, required to automagically adjust the map's bounds.
      let northWestLatLng = L.latLng(nw.lat, nw.lng);
      let southEastLatLng = L.latLng(se.lat, se.lng);
console.log('northWestLatLng: %o', northWestLatLng);
console.log('southEastLatLng: %o', southEastLatLng);
      bounds = L.latLngBounds(northWestLatLng, southEastLatLng);

// This bounds var is to be used initially for the Map, where it will change the map's actual bounds.
console.log('bounds %o', bounds);

console.log('nw: %o', nw);
console.log('se: %o', se);



      // Now we have bounds we can set sensible radii.

// This bounds var is to be used upon rerender, when the map's actual bounds have changed.
// The methods for getting all four corners are available, e.g.: getNorthWest(); getSouthEast().
console.log('this.map.leafletElement.getBounds(): %o', this.map.leafletElement.getBounds());

      let actualBounds = this.map.leafletElement.getBounds();

      let actualNorthWestLatLng = actualBounds.getNorthWest();
      let actualSouthEastLatLng = actualBounds.getSouthEast();

console.log('actualNorthWestLatLng: %o', actualNorthWestLatLng);
console.log('actualSouthEastLatLng: %o', actualSouthEastLatLng);

      // If the map starts to loop (wrap?), we need to correct the bounds,
      // so the piecharts don't get clipped.
      if (se.lng < nw.lng) {
        se.lng = 180, nw.lng = -180;
console.log('clip');
      }

      // Filter piecharts to those that fall within the bounds,
      // and work out the area of each piechart.
      // NB: This is in lat/lng, but we only need to be rough.
      let pieAreaSum = markers
        .filter(
          (marker) => {
            let thing = (
              marker.get('lat') > se.lat &&
              marker.get('lat') < nw.lat &&
              marker.get('lng') > nw.lng &&
              marker.get('lng') < se.lng
            );
console.log('filter: ' + thing);
            return thing;
          }
        )
        .map(
          (marker) => {
console.log('map: ' + marker.get('radius') * marker.get('radius') * 2 * Math.PI);
            return (marker.get('radius') * marker.get('radius') * 2 * Math.PI);
          }
        )
        .reduce(
          (sum, val) => {
console.log('reduce: ' + (sum + val, 0));
            return (sum + val, 0);
          }
        );


console.log('pieAreaSum: %o', pieAreaSum);

      if (pieAreaSum > 0) {
        nw = latlngToMercatorXY(nw);
        se = latlngToMercatorXY(se);
        let mapArea = (nw.y - se.y) * (se.x - nw.x);
        let factor = 75 * Math.sqrt(mapArea / pieAreaSum);
        this.lastFactor = factor;
      }

console.log('lastFactor: %o', this.lastFactor);

      // if (this.lastFactor) {
      markers = markers.map((marker) => marker.set('radius', marker.get('radius') * this.lastFactor));
      // } else {
      //   markers = Immutable.List();
      // }

    }

    const TileLayerUrl = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    const TileLayerAttribution = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

    let crs = L.CRS.EPSG3857; // this.map is not available on the first render.
    if (this.map) {
      crs = this.map.leafletElement.options.crs;
    }

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
                  url={TileLayerUrl}
                  attribution={TileLayerAttribution}
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
