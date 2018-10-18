import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import PropTypes from 'prop-types';
import Tooltip from '@material-ui/core/Tooltip';
import filterChildren from 'util/filterChildren';

let MuiTooltip = createReactClass({
  displayName: 'MuiTooltip',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    children: PropTypes.node,
    PopperProps: PropTypes.object,
  },

  render() {
    let {children, ...otherProps} = this.props;
    children = filterChildren(this, children);
    if (Array.isArray(children)) {
      throw Error('MuiTooltip can only have one child');
    }

    return (
      <Tooltip {...otherProps}>
        {children}
      </Tooltip>
    );
  },
});

export default MuiTooltip;
