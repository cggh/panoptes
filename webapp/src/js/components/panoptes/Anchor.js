import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _isArray from 'lodash/isArray';
import filterChildren from 'util/filterChildren';

//Child of CustomButton

let Anchor = React.createClass({
  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    onClick: React.PropTypes.func,
  },

  render() {
    let {children} = this.props;
    children = filterChildren(this, children);
    if (_isArray(children)) {
      throw Error('Anchor can only have one child until https://github.com/facebook/react/issues/2127');
    }
    return React.cloneElement(children, {onClick: this.props.onClick});
  }
});

export default Anchor;
