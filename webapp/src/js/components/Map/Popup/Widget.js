import React from 'react';
import {Popup as LeafletPopup} from 'react-leaflet';
import filterChildren from 'util/filterChildren';

// Mixins
import FluxMixin from 'mixins/FluxMixin';

let MapPopup = React.createClass({

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
    let children = filterChildren(this, this.props.children);
    return (
      <LeafletPopup
        children={React.Children.only(children)}
      />
    );

  }

});

export default MapPopup;
