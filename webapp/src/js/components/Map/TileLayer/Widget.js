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
    maxZoom: React.PropTypes.number,
    minZoom: React.PropTypes.number,
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
    let {attribution, maxZoom, minZoom, url} = this.props;

    // FIXME: How to handle double quotes inside double quotes inside single quotes (!) in descriptions in templates.

    // NB: Only the props url, opacity and zIndex are dynamic.
    // The props attribution, maxZoom, minZoom will not update automatically.
    /* https://github.com/PaulLeCam/react-leaflet/blob/master/docs/Components.md

      The properties documented as dynamic properties are updated using the relevant Leaflet setter, other properties will not update the component when they are changed after the component is mounted.
      All other properties are passed as the options argument to their corresponding Leaflet element and should work fine for static maps, it is however unlikely that they would updated if you change them afterwards.

    */
    // https://github.com/PaulLeCam/react-leaflet/blob/master/docs/Components.md#tilelayer

    // We workaround this, to make sure that those props (e.g. attribution) are updated accordingly
    // by changing the key whenever those props change, thereby causing React to remount the component.

    return (
      <TileLayer
        key={JSON.stringify({attribution, maxZoom, minZoom})}
        attribution={attribution}
        children={undefined}
        maxZoom={maxZoom}
        minZoom={minZoom}
        url={url}
      />
    );

  }

});

module.exports = TileLayerWidget;
