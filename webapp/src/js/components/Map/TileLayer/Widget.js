import React from 'react';

import {TileLayer as LeafletTileLayer} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let TileLayer = React.createClass({

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
    ext: React.PropTypes.string,
    format: React.PropTypes.string,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    maxNativeZoom: React.PropTypes.oneOfType([React.PropTypes.number, React.PropTypes.string]),
    maxZoom: React.PropTypes.oneOfType([React.PropTypes.number, React.PropTypes.string]),
    minZoom: React.PropTypes.oneOfType([React.PropTypes.number, React.PropTypes.string]),
    opacity: React.PropTypes.oneOfType([React.PropTypes.number, React.PropTypes.string]),
    tms: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.string]),
    url: React.PropTypes.string.isRequired,
    variant: React.PropTypes.string,
    zIndex: React.PropTypes.oneOfType([React.PropTypes.number, React.PropTypes.string]),
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
      ext: 'png',
      maxZoom: 17,
      minZoom: 0,
      url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'
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

  }

});

export default TileLayer;
