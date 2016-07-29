import React from 'react';
import {FeatureGroup, Marker} from 'react-leaflet';
import DivIcon from 'react-leaflet-div-icon';

// Lodash
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';

// Mixins
import FluxMixin from 'mixins/FluxMixin';


let LayerMapMarkerLayer = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    markers: React.PropTypes.arrayOf(React.PropTypes.object),
    color: React.PropTypes.string
  },

  getDefaultProps() {
    return {

    };
  },

  handleClickMarker(e, marker) {
    const middleClick =  e.originalEvent.button == 1 || e.originalEvent.metaKey || e.originalEvent.ctrlKey;
    // TODO: when left click, focus dataItemPopup. When middleclick, maintain focus on this component.
    this.getFlux().actions.panoptes.dataItemPopup({table: marker.table, primKey: marker.primKey.toString(), switchTo: !middleClick});
  },

  render() {

    let {markers, color} = this.props;


    let L = window.L;
    let mapMarkers = undefined;
    let bounds = undefined;

    if (markers !== undefined) {

      if (markers.length >= 1) {

        let northWest = L.latLng(_maxBy(markers, 'lat').lat, _minBy(markers, 'lng').lng);
        let southEast = L.latLng(_minBy(markers, 'lat').lat, _maxBy(markers, 'lng').lng);

        bounds = L.latLngBounds(northWest, southEast);
      }

      mapMarkers = [];

      for (let i = 0, len = markers.length; i < len; i++) {

        // Create a new marker at the given position.

        let conditionalMarkerProps = {};
        let conditionalMarkerChild = null;

        if (markers[i].isHighlighted || len === 1) {
          // If this icon isHighlighted or if there is only one marker, give this marker the standard "big" icon.
          // no op
        } else {
          // Otherwise (if this icon is not highlighted and there is more than one icon), give this marker a "small" icon.

          // FIXME: Workaround to hide the default icon.
          conditionalMarkerProps.icon = L.divIcon({html: ''});

          // Using DivIcon so we can easily put JSX and React components in here, e.g. <HelloWorld msg="foobar"/>
          conditionalMarkerChild = (
            <DivIcon position={{lat: markers[i].lat, lng: markers[i].lng}}>
              <svg height="16" width="16"><circle cx="8" cy="8" r="6" stroke="#BC0F0F" strokeWidth="1" fill="#F26C6C" /></svg>
            </DivIcon>
          );
        }

        let mapMarker = (
          <Marker
            key={i}
            position={{lat: markers[i].lat, lng: markers[i].lng}}
            title={markers[i].title}
            onClick={(e) => this.handleClickMarker(e, {table: markers[i].table, primKey: markers[i].primKey.toString()})}
            {...conditionalMarkerProps}
          >
            {conditionalMarkerChild}
          </Marker>
        );

        mapMarkers.push(mapMarker);

      }
    }

    return (
      <FeatureGroup color={color}>
        {mapMarkers}
      </FeatureGroup>
    );

  }

});

module.exports = LayerMapMarkerLayer;
