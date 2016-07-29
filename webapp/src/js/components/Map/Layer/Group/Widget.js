import React from 'react';
import {FeatureGroup} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';


let LayerMapLayerGroupWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    children: React.PropTypes.node,
    color: React.PropTypes.string
  },

  getDefaultProps() {
    return {

    };
  },

  render() {

    let {children, color} = this.props;

    return (
      <FeatureGroup color={color}>
        {children}
      </FeatureGroup>
    );

  }

});

module.exports = LayerMapLayerGroupWidget;
