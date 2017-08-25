import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _assign from 'lodash.assign';

let TabPane = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    title: PropTypes.string,
    active: PropTypes.bool, //Usually set by TabbedArea
    replaceable: PropTypes.bool, //Usually set by TabbedArea
    children: PropTypes.element,
    className: PropTypes.string,
    updateTitleIcon: PropTypes.func
  },

  icon() {
    if (this.child.icon) {
      return this.child.icon();
    }
    const child = React.Children.only(this.props.children);
    if (child.props.icon) {
      return child.props.icon;
    }
    return null;
  },
  title() {
    if (this.child.title) {
      return this.child.title();
    }
    const child = React.Children.only(this.props.children);
    if (child.props.title) {
      return child.props.title;
    }
    return 'Untitled';
  },

  render() {
    const divProps = _assign({}, this.props);
    delete divProps.active;
    delete divProps.compId;
    delete divProps.updateTitleIcon;
    delete divProps.replaceable;

    let classes = {
      'tab-pane': true,
      'active': this.props.active,
      'inactive': !this.props.active
    };

    let child = React.Children.only(this.props.children);
    let extraProps = {replaceable: this.props.replaceable};
    if (child && child.type.propTypes && child.type.propTypes.updateTitleIcon) {
      Object.assign(extraProps, {updateTitleIcon: this.props.updateTitleIcon});
    }

    return (
      <div {...divProps} className={classNames(this.props.className, classes)}>
        {React.cloneElement(child, {
          ...extraProps,
          ref: (node) => this.child = node
        })}
      </div>
    );
  }

});

export default TabPane;
