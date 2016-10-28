import React from 'react';

let ComponentStack = React.createClass({

  propTypes: {
    children: React.PropTypes.node,
    title: React.PropTypes.string
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
