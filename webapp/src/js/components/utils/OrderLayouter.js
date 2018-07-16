import PropTypes from 'prop-types';
import React from 'react';

// Lodash
import _forEach from 'lodash.foreach';
import _values from 'lodash.values';
import _assign from 'lodash.assign';
import _min from 'lodash.min';


class OrderLayouter extends React.Component {
  static displayName = 'OrderLayouter';

  static contextTypes = {
    map: PropTypes.object,
  };

  static defaultProps = {
    nodes: []
  };

  static propTypes = {
    nodes: PropTypes.array.isRequired,
    children: PropTypes.func.isRequired
  };

  render() {
    let {nodes} = this.props;
    nodes = nodes.sort((a, b) => b.radius - a.radius);
    _forEach(nodes, (node) => {
      node.fixedNode = node;
    });

    return this.props.children(nodes);
  }
}

export default OrderLayouter;
