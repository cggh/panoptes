import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import filterChildren from 'util/filterChildren';

//Child of ExpandingCard

let ExpandingCardActions = createReactClass({
  displayName: 'ExpandingCardActions',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    children: PropTypes.node,
  },

  render() {
    let {children} = this.props;
    children = filterChildren(this, children);
    return React.cloneElement(children, {});
  },
});

export default ExpandingCardActions;
