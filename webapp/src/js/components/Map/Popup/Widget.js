import React from 'react';
import {Popup} from 'react-leaflet';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let PopupWidget = React.createClass({

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
      layerContainer: this.props.layerContainer !== undefined ? this.props.layerContainer : this.context.layerContainer,
      map: this.props.map !== undefined ? this.props.map : this.context.map
    };
  },

  render() {

    let {children} = this.props;

    if (children instanceof Array) {
      if (children.length > 1) {
        console.warn('PopupWidget received more than one child. Using first child.');
        // NB: <Popup><p>foo</p><p>bar</p></Popup> would error,
        // whereas <Popup><div><p>foo</p><p>bar</p></div></Popup> is valid.
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
