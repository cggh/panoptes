import React from 'react';

import {TileLayer} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let TileLayerWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    attribution: React.PropTypes.string,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    url: React.PropTypes.string.isRequired
  },

  getDefaultProps() {
    return {
      attribution: '&copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
    };
  },

  render() {
    let {attribution, layerContainer, map, url} = this.props;
console.log('TileLayerWidget props: %o', this.props);

    // FIXME: How to handle double quotes inside double quotes inside single quotes (!) in descriptions in templates.

    return (
      <TileLayer
        attribution={attribution}
        children={null}
        layerContainer={layerContainer}
        map={map}
        url={url}
      />
    );

  }

});

module.exports = TileLayerWidget;
