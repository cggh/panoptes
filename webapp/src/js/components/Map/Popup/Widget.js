import React from 'react';
import {Popup} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let PopupWidget = React.createClass({

  mixins: [
    FluxMixin
  ],

  propTypes: {
    children: React.PropTypes.node
  },


  render() {

    let {children} = this.props;

    if (children instanceof Array) {
      if (children.length > 1) {
        console.warn('PopupWidget received more than one child. Using first child.');
      }
      children = children[0];
    }

    return (
      <Popup
        children={children}
      />
    );

  }

});

module.exports = PopupWidget;
