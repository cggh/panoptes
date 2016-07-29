import React from 'react';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import LayerMapWidget from 'Map/Layer/Widget';
import MapMarkerWidget from 'Map/Marker/Widget';

let MapWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    title: React.PropTypes.string,
    zoom: React.PropTypes.string,
    centerLat: React.PropTypes.string,
    centerLng: React.PropTypes.string,
    children: React.PropTypes.array
  },

  title() {
    return this.props.title;
  },

  render() {
    let {centerLat, centerLng, zoom, children} = this.props;

    let optionalProps = {};

    if (!isNaN(centerLat) && !isNaN(centerLng)) {
      optionalProps.center = {lat: Number(centerLat), lng: Number(centerLng)};
    }

    if (!isNaN(zoom)) {
      optionalProps.zoom = Number(zoom);
    }

    let optionalMarkerLayer = null;
    if (children) {
console.log('MapWidget children: %o', children);
      //optionalMarkerLayer = <LayerMapMarkerLayer markers={markers} />;
    }

    return (
      <LayerMapWidget {...optionalProps}>
        {children}
      </LayerMapWidget>
    );

  }

});

module.exports = MapWidget;
