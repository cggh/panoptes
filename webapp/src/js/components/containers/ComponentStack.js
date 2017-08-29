import PropTypes from 'prop-types';
import React from 'react';

class ComponentStack extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    title: PropTypes.string
  };

  title = () => this.props.title;

  render() {
    return (
      <div>
        {this.props.children}
      </div>
    );

  }
}

export default ComponentStack;
