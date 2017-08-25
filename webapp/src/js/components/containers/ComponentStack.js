import PropTypes from 'prop-types';
import React from 'react';

let ComponentStack = React.createClass({

  propTypes: {
    children: PropTypes.node,
    title: PropTypes.string
  },

  title() {
    return this.props.title;
  },

  render() {
    return (
      <div>
        {this.props.children}
      </div>
    );

  }

});

export default ComponentStack;
