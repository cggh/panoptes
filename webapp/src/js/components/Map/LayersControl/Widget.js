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
    hideLayersControl: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.bool]),
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object
  },
  // TODO: hideLayersControl has not been implemented (and is not implemented in leaflet)

  render() {

    let {children, hideLayersControl, layerContainer, map} = this.props;

console.log('LayersControlWidget props: %o', this.props);

    let hideLayersControlBoolean = null;
    if (
      (typeof hideLayersControl === 'string' && hideLayersControl.toLowerCase() === 'true')
      || (typeof hideLayersControl === 'boolean' && hideLayersControl === true)
    ) {
      hideLayersControl = true;
    } else {
      hideLayersControl = false;
    }

    if (hideLayersControl === null) {
      console.error('LayersControlWidget could not determine hideLayersControl status');
    }


    if (hideLayersControlBoolean) {
      // TODO: implement
      //style = {display: 'none'};
    }

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
