import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import {WMSTileLayer as LeafletWMSTileLayer} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

/* To use Web Map Service Tile Layer in templates:

  <p>WMS Tile Layer:</p>
  <div style="width:300px;height:300px">
  <Map center="[37, -97]" zoom="5"><TileLayer /><WMSTileLayer /></Map>
  </div>

*/

// TODO: Is crs passed on to WMSTileLayer automatically (from Map) via context?

let WMSTileLayer = createReactClass({
  displayName: 'WMSTileLayer',

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
    attribution: PropTypes.string,
    format: PropTypes.string,
    layerContainer: PropTypes.object,
    layers: PropTypes.string, // Comma-separated list of WMS layers to show
    map: PropTypes.object,
    transparent: PropTypes.bool,
    url: PropTypes.string.isRequired,
    version: PropTypes.string
  },

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

  getDefaultProps() {
    return {
      attribution: 'Weather data © 2012 IEM Nexrad',
      format: 'image/png',
      layers: 'nexrad-n0r-900913',
      transparent: true,
      url: 'http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi'
    };
  },

  render() {
    let {attribution, format, layers, transparent, url} = this.props;

    // FIXME: How to handle double quotes inside double quotes inside single quotes (!) in descriptions in templates.

    return (
      <LeafletWMSTileLayer
        attribution={attribution}
        children={undefined}
        format={format}
        layers={layers}
        transparent={transparent}
        url={url}
      />
    );

  },
});

export default WMSTileLayer;
