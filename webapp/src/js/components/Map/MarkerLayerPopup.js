import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _isArray from 'lodash.isarray';
import filterChildren from 'util/filterChildren';

//Child of MarkersLayer

let MarkerLayerPopup = createReactClass({
  displayName: 'MarkerLayerPopup',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
  },

  render() {
    let {children} = this.props;
    children = filterChildren(this, children);
    if (_isArray(children)) {
      throw Error('MarkerLayerPopup can only have one child');
    }
    return children;
  },
});

export default MarkerLayerPopup;
