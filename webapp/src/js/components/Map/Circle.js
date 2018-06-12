import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {CircleMarker as LeafletCircle} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let Circle = createReactClass({
  displayName: 'Circle',

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },

  propTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    center: PropTypes.object.isRequired, // shape {lat: num, lng: num}
    radius: PropTypes.number,
  },

  // Without this: TypeError: Cannot read property 'addLayer' of undefined
  childContextTypes: {
    layerContainer: PropTypes.object,
    map: PropTypes.object
  },
  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map
    };
  },

  render() {
    let {center, ...otherProps} = this.props;
console.log('Circle props', this.props);
    // Convert lat, lng strings to numbers
    center.lat = Number(center.lat);
    center.lng = Number(center.lng);
    return (
      <LeafletCircle
        center={center}
        {...otherProps}
      />
    );
  },
});

export default Circle;
