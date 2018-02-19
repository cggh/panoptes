import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

const BIG = createReactClass({
  displayName: 'BIG',

  propTypes: {
    children: PropTypes.node,
  },

  render() {
    const {children} = this.props;
    return <span style={{fontSize: 'large', fontWeight: 'bold'}}>{children}</span>;
  }
});

export default BIG;
