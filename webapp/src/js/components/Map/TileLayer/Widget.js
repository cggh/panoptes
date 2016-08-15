import React from 'react';

import {TileLayer} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let TileLayerWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  contextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  propTypes: {
    attribution: React.PropTypes.string,
    url: React.PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
      attribution: '&copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
    };
  },

  render() {
    let {attribution, url} = this.props;

    // FIXME: How to handle double quotes inside double quotes inside single quotes (!) in descriptions in templates.

    return (
      <TileLayer
        attribution={attribution}
        children={null}
        url={url}
      />
    );

  }

});

module.exports = TileLayerWidget;
