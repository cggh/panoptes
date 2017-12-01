import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _isArray from 'lodash.isarray';
import filterChildren from 'util/filterChildren';

//Child of TableMarkersLayerCustomMarker

let CustomMarker = createReactClass({
  displayName: 'CustomMarker',

  mixins: [
    PureRenderMixin,
  ],

  render() {
    let {children, ...others} = this.props;
    children = filterChildren(this, children);
    if (_isArray(children)) {
      throw Error('CustomMarker can only have one child until https://github.com/facebook/react/issues/2127');
    }
    return React.cloneElement(children, {...others});
  },
});

export default CustomMarker;
