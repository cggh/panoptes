import React from 'react';

import {FeatureGroup} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let FeatureGroupWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  //NB: layerContainer and map are being provided as props here rather than context (by react-leaflet and Panoptes).
  // So, copying the layerContainer and map into context...

  propTypes: {
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  childContextTypes: {
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  getChildContext() {
    return {
      layerContainer: this.props.layerContainer,
      map: this.props.map
    };
  },

  render() {
    let {children} = this.props;
console.log('FeatureGroupWidget props: %o', this.props);
console.log('FeatureGroupWidget context: %o', this.context);

    return (
      <FeatureGroup
        children={children}
      />
    );

  }

});

module.exports = FeatureGroupWidget;
