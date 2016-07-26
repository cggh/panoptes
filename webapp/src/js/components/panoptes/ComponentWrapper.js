import React from 'react';
import Immutable from 'immutable';
import _isFunction from 'lodash/isFunction';

// This component wraps a component that has a "componentUpdate" method,
// such that it's props will be changed by the call to update eg:
// <ComponentWrapper>
//   <GenomeBrowser table="variants"/>
// </ComponentWrapper>

let ComponentWrapper = React.createClass({
  propTypes: {
    children: React.PropTypes.element.isRequired
  },

  componentWillMount() {
    const child = React.Children.only(this.props.children);
    this.setState({childProps: Immutable.fromJS(child.props)});
  },

  componentWillReceiveProps(nextProps) {
    console.warn('Component wrapper does not pass on changing props');
  },

  render() {
    const child = React.Children.only(this.props.children);
    const {childProps} = this.state;

    return React.cloneElement(child,
      {
        ...childProps.toObject(),
        componentUpdate: (updater) => {
          if (_isFunction(updater))
            this.setState({childProps: childProps.update(updater)});
          else
            this.setState({childProps: childProps.merge(updater)});
        }
      }
    );
  }

});

module.exports = ComponentWrapper;
