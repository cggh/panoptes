import React from 'react';
import ReactDOM from 'react-dom';
import {Map, Marker, Popup, TileLayer} from 'react-leaflet';
import DivIcon from 'react-leaflet-div-icon';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import DetectResize from 'utils/DetectResize';
// TODO: import GeoLayouter from 'utils/GeoLayouter';

// CSS
import 'leaflet.css';

// Lodash
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';

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
    this.refs.map.leafletElement.invalidateSize();
  },
  handleMarkerClick(e, payload) {
    let {table, primKey} = payload;
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    if (middleClick) {
      // TODO: stop the dataItemPopup stealing focus.
    }
    let switchTo = !middleClick;
    this.getFlux().actions.panoptes.dataItemPopup({table, primKey, switchTo});
  },

  render() {
    let {center, zoom, markers} = this.props;

    let L = window.L;
    let mapMarkers = undefined;
    let bounds = undefined;

    if (markers !== undefined) {

      if (markers.size >= 1) {

        let markersJS = markers.toJS();

        let northWest = L.latLng(_maxBy(markersJS, 'lat').lat, _minBy(markersJS, 'lng').lng);
        let southEast = L.latLng(_minBy(markersJS, 'lat').lat, _maxBy(markersJS, 'lng').lng);

        bounds = L.latLngBounds(northWest, southEast);
      }

      mapMarkers = [];

      for (let i = 0, len = markers.size; i < len; i++) {

        // Create a new marker at the given position.

        let marker = markers.get(i);

        let conditionalMarkerProps = {};
        let conditionalMarkerChild = null;

        if (marker.isHighlighted || len === 1) {
          // If this icon isHighlighted or if there is only one marker, give this marker the standard "big" icon.
          // no op
        } else {
          // Otherwise (if this icon is not highlighted and there is more than one icon), give this marker a "small" icon.

          // FIXME: Workaround to hide the default icon.
          conditionalMarkerProps.icon = L.divIcon({html: ''});

          // Using DivIcon so we can easily put JSX and React components in here, e.g. <HelloWorld msg="foobar"/>
          conditionalMarkerChild = (
            <DivIcon position={{lat: marker.get('lat'), lng: marker.get('lng')}}>
              <svg height="16" width="16"><circle cx="8" cy="8" r="6" stroke="#BC0F0F" strokeWidth="1" fill="#F26C6C" /></svg>
            </DivIcon>
          );
        }

        let mapMarker = (
          <Marker
            key={i}
            position={{lat: marker.get('lat'), lng: marker.get('lng')}}
            title={marker.title}
            onClick={(e) => this.handleMarkerClick(e, {table: marker.get('locationTable'), primKey: marker.get('locationPrimKey').toString()})}
            {...conditionalMarkerProps}
          >
            {conditionalMarkerChild}
          </Marker>
        );

        mapMarkers.push(mapMarker);

      }
    }

    const TileLayerUrl = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    const TileLayerAttribution = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <Map
          ref="map"
          center={center}
          zoom={zoom}
          style={{height: '100%', width: '100%'}}
          bounds={bounds}
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

module.exports = PieChartMapLeafletView;
