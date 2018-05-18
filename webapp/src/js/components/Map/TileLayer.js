import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import {TileLayer as LeafletTileLayer} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let TileLayer = createReactClass({
  displayName: 'TileLayer',

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
    bounds: PropTypes.array,
    ext: PropTypes.string,
    format: PropTypes.string,
    layerContainer: PropTypes.object,
    map: PropTypes.object,
    maxNativeZoom: PropTypes.number,
    maxZoom: PropTypes.number,
    minZoom: PropTypes.number,
    opacity: PropTypes.number,
    tms: PropTypes.bool,
    url: PropTypes.string.isRequired,
    variant: PropTypes.string,
    zIndex: PropTypes.number,
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
      attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a> &copy; <a href=\"http://cartodb.com/attributions\">CartoDB</a>",
      ext: 'png',
      maxZoom: 17,
      minZoom: 0,
      url: `${location.protocol}//{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`
    };
  },

  render() {
    let {attribution, bounds, ext, format, maxNativeZoom, maxZoom, minZoom, opacity, tms, url, variant, zIndex} = this.props;

    // FIXME: How to handle double quotes inside double quotes inside single quotes (!) in descriptions in templates.

    // NB: Only the props url, opacity and zIndex are dynamic.
    // The props attribution, maxZoom, minZoom, etc. will not update automatically.
    /* https://github.com/PaulLeCam/react-leaflet/blob/master/docs/Components.md

      The properties documented as dynamic properties are updated using the relevant Leaflet setter, other properties will not update the component when they are changed after the component is mounted.
      All other properties are passed as the options argument to their corresponding Leaflet element and should work fine for static maps, it is however unlikely that they would updated if you change them afterwards.

    */
    // https://github.com/PaulLeCam/react-leaflet/blob/master/docs/Components.md#tilelayer

    // We workaround this, to make sure that those props (e.g. attribution) are updated accordingly
    // by changing the key whenever those props change, thereby causing React to remount the component.

    // If maxNativeZoom is supplied to TileLayer undefined, then it causes /NaN/0/0.png 404 errors [22 Sep 2016]
    let adaptedProps = {};
    if (maxNativeZoom !== undefined) {
      adaptedProps.maxNativeZoom = maxNativeZoom;
    }

    // NB: Setting an errorTileUrl for missing tiles does not prevent 404 errors, and causes visible swap.
    // Perhaps use bounds instead, if possible, which will prevent 404 errors.
    // errorTileUrl="/dist/mapTiles/invisible.png"

    return (
      <LeafletTileLayer
        {...adaptedProps}
        attribution={attribution}
        bounds={bounds}
        children={undefined}
        detectRetinea="true"
        ext={ext}
        format={format}
        key={JSON.stringify({attribution, maxNativeZoom, maxZoom, minZoom, variant})}
        maxZoom={maxZoom}
        minZoom={minZoom}
        opacity={opacity}
        reuseTiles="true"
        tms={tms}
        url={url}
        variant={variant}
        zIndex={zIndex}
      />
    );

  },
});

export default TileLayer;
