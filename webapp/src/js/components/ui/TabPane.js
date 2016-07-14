import React from 'react';
import classNames from 'classnames';
import PureRenderMixin from 'mixins/PureRenderMixin';

let TabPane = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    title: React.PropTypes.string,
    active: React.PropTypes.bool, //Usually set by TabbedArea
    children: React.PropTypes.element
  },

  icon() {
    return this.refs.child.icon ? this.refs.child.icon() : null;
  },
  title() {
    return this.refs.child.title ? this.refs.child.title() : null;
  },

  render() {
    const divProps = Object.assign({}, this.props);
    delete divProps.active;
    delete divProps.compId;

    let classes = {
      'tab-pane': true,
      'active': this.props.active
    };

    return (
      <div {...divProps} className={classNames(this.props.className, classes)}>
        {React.cloneElement(this.props.children, {ref: 'child'})}
      </div>
    );
  }

});

module.exports = TabPane;
