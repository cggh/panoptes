import React from 'react';

import {ImageOverlay as LeafletImageOverlay} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let ImageOverlay = React.createClass({

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

  render() {
    let {attribution, bounds, url, opacity} = this.props;

    // NB: Only the props url and opacity are dynamic.
    // The props attribution and bounds will not update automatically.
    /* https://github.com/PaulLeCam/react-leaflet/blob/master/docs/Components.md

      The properties documented as dynamic properties are updated using the relevant Leaflet setter, other properties will not update the component when they are changed after the component is mounted.
      All other properties are passed as the options argument to their corresponding Leaflet element and should work fine for static maps, it is however unlikely that they would updated if you change them afterwards.

    */
    // https://github.com/PaulLeCam/react-leaflet/blob/master/docs/Components.md#imageoverlay

    // We workaround this, to make sure that those props (e.g. attribution) are updated accordingly
    // by changing the key whenever those props change, thereby causing React to remount the component.

    return (
      <LeafletImageOverlay
        attribution={attribution}
        bounds={bounds}
        key={JSON.stringify({attribution, bounds})}
        opacity={opacity}
        url={url}
      />
    );

  }

});

export default ImageOverlay;
