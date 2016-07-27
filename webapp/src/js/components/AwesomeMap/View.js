import React from 'react';
import {Map} from 'react-leaflet';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import DetectResize from 'utils/DetectResize';

// CSS
import 'leaflet.css';

let AwesomeMapView = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    center: React.PropTypes.array.isRequired,
    zoom: React.PropTypes.number.isRequired,
    height: React.PropTypes.string,
    width: React.PropTypes.string,
    children: React.PropTypes.node
  },

  getDefaultProps() {
    return {
      center: [0, 0],
      zoom: 0,
      height: '100%'
    };
  },

  // Event handlers
  handleDetectResize() {
    if (this.map) {
      this.map.leafletElement.invalidateSize();
    }
  },

  render() {
    let {center, zoom, height, width, children} = this.props;

    let optionalMapStyles = {};
    if (width !== undefined) {
      optionalMapStyles.width = width;
    }

    return (
      <DetectResize onResize={this.handleDetectResize}>
        <Map
          style={{height, ...optionalMapStyles}}
          center={center}
          zoom={zoom}
          ref={(ref) => this.map = ref}
        >
        {children}
        </Map>
      </DetectResize>
    );
  }

});

module.exports = AwesomeMapView;
