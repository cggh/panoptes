import React from 'react';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

// Panoptes components
import LayeredMapWidget from 'Map/Layered/Widget';
import LayeredMapMarkerLayer from 'Map/Layered/MarkerLayer';

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
console.log('MapWidget children: %o', children);
    let optionalProps = {};

    if (!isNaN(centerLat) && !isNaN(centerLng)) {
      optionalProps.center = {lat: Number(centerLat), lng: Number(centerLng)};
    }

    if (!isNaN(zoom)) {
      optionalProps.zoom = Number(zoom);
    }

    return (
      <LayeredMapWidget {...optionalProps}>
        {(children && children.length > 0)  ? <LayeredMapMarkerLayer>{children}</LayeredMapMarkerLayer> : null}
      </LayeredMapWidget>
    );

  }

});

module.exports = MapWidget;
