import React from 'react';
import DivIcon from 'react-leaflet-div-icon';

import {
  TileLayer,
  Marker
} from 'react-leaflet';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import LayeredMapWidget from 'Map/Layered/Widget';
import LayeredMapMarkerLayer from 'Map/Layered/MarkerLayer';

// Lodash
import _minBy from 'lodash/minBy';
import _maxBy from 'lodash/maxBy';

let TableMapView = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.array,
    zoom: React.PropTypes.number,
    markers: React.PropTypes.array
  },

  render() {
    let {center, zoom, markers} = this.props;

    let TileLayerUrl = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
    let TileLayerAttribution = '&copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';
console.log('TableMapView using LayeredMapWidget');
    return (
      <LayeredMapWidget
        center={center}
        zoom={zoom}
      >
        <TileLayer
          url={TileLayerUrl}
          attribution={TileLayerAttribution}
        />
        <LayeredMapMarkerLayer markers={markers} />
      </LayeredMapWidget>
    );

  }

});

module.exports = TableMapView;
