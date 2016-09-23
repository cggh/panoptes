import React from 'react';

import {ImageOverlay} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let ImageOverlayWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map might be provided as props rather than context (e.g. <Map><GetsProps><GetsContext /></GetsProps></Map>
  // in which case, we copy those props into context. Props override context.

  contextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },
  propTypes: {
    attribution: React.PropTypes.string,
    bounds: React.PropTypes.array,
    url: React.PropTypes.string,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    opacity: React.PropTypes.number
  },
  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map
    };
  },
  getDefaultProps() {
    return {
      bounds: [[40.712216, -74.22655], [40.773941, -74.12544]],
      url: 'http://www.lib.utexas.edu/maps/historical/newark_nj_1922.jpg'
    };
  },

  render() {
    let {attribution, bounds, url, opacity} = this.props;

    return (
      <ImageOverlay
        bounds={bounds}
        attribution={attribution}
        url={url}
        opacity={opacity}
      />
    );

  }

});

module.exports = ImageOverlayWidget;
