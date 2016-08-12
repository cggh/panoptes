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

console.log('PopupWidget props: %o', this.props);
console.log('PopupWidget context: %o', this.context);

    if (children instanceof Array) {
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
