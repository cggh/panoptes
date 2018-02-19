import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import filterChildren from 'util/filterChildren';
import _orderBy from 'lodash.orderby';

const SortChildren = createReactClass({

  propTypes: {
    // FIXME: Automatic string-to-array conversion doesn't work for PropTypes.arrayOf
    //order: PropTypes.arrayOf(PropTypes.shape({prop: PropTypes.string, descending: PropTypes.bool})).isRequired,
    order: PropTypes.array.isRequired,
    children: PropTypes.node.isRequired
  },

  render() {
    const {order, children} = this.props;

    //Remove whitespace children
    const filteredChildren = filterChildren(this, children);

    // Convert the order config into array structures, for _orderBy.
    let orderPropArray = [];
    let orderDescArray = [];
    for (let orderIndex = 0, orderLength = order.length; orderIndex < orderLength; orderIndex++) {
      orderPropArray.push(order[orderIndex].prop);
      orderDescArray.push(order[orderIndex].descending ? 'desc' : 'asc');
    }

    // Create a parallel array to represent the children, for _orderBy.
    let indexedChildren = [];
    for (let childIndex = 0, childrenLength = filteredChildren.length; childIndex < childrenLength; childIndex++) {
      let child = {originalIndex: childIndex, ...filteredChildren[childIndex].props};
      indexedChildren.push(child);
    }

    // Sort the children objects.
    const sortedChildrenIndexes = _orderBy(indexedChildren, orderPropArray, orderDescArray);
    let sortedChildren = [];
    for (let childIndex = 0, childrenLength = sortedChildrenIndexes.length; childIndex < childrenLength; childIndex++) {
      sortedChildren.push(filteredChildren[sortedChildrenIndexes[childIndex].originalIndex]);
    }
    return sortedChildren;
  }

});

export default SortChildren;
