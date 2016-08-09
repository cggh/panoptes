import React from 'react';
import {Marker} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let MapMarkerWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    lat: React.PropTypes.string.isRequired,
    lng: React.PropTypes.string.isRequired,
    title: React.PropTypes.string
  },

  render() {

    let {lat, lng, title} = this.props;

    if  (isNaN(lat)) {
      console.error('MapMarkerWidget lat is not a number');
      return null;
    }
    if  (isNaN(lng)) {
      console.error('MapMarkerWidget lng is not a number');
      return null;
    }

    return (
      <Marker position={{lat: Number(lat), lng: Number(lng)}} title={title} />
    );

  }

});

module.exports = MapMarkerWidget;
