import React from 'react';

import {FeatureGroup} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let FeatureGroupWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },

  render() {
    let {children, layerContainer, map} = this.props;
console.log('FeatureGroupWidget props: %o', this.props);

    return (
      <FeatureGroup
        children={children}
        layerContainer={layerContainer}
        map={map}
      />
    );

  }

});

module.exports = FeatureGroupWidget;
