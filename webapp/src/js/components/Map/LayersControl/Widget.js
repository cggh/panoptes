import React from 'react';
import {LayersControl} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let LayersControlWidget = React.createClass({

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

console.log('LayersControlWidget props: %o', this.props);


    return (
      <LayersControl
        children={children}
        layerContainer={layerContainer}
        map={map}
      />
    );

  }

});

module.exports = LayersControlWidget;
