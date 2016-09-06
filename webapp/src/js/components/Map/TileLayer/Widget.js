import React from 'react';

import {TileLayer} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let TileLayerWidget = React.createClass({

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
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    url: React.PropTypes.string.isRequired
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
      attribution: '&copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
    };
  },

  render() {
    let {attribution, url} = this.props;
console.log('TileLayer props: %o', this.props);
console.log('TileLayer context: %o', this.context);
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
