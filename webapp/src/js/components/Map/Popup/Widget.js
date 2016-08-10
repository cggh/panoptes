import React from 'react';
import {Popup} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let PopupWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    children: React.PropTypes.node,
    layerContainer: React.PropTypes.object,
    map: React.PropTypes.object,
    popupContainer: React.PropTypes.object
  },


  render() {

    let {children, layerContainer, map, popupContainer} = this.props;

console.log('PopupWidget props: %o', this.props);

    children = children[0];

    return (
      <Popup
        children={children}
        layerContainer={layerContainer}
        map={map}
        popupContainer={popupContainer}
      />
    );

  }

});

module.exports = PopupWidget;
