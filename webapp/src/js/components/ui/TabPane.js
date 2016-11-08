import React from 'react';
import classNames from 'classnames';
import PureRenderMixin from 'mixins/PureRenderMixin';

let TabPane = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    title: React.PropTypes.string,
    active: React.PropTypes.bool, //Usually set by TabbedArea
    children: React.PropTypes.element,
    className: React.PropTypes.string,
    updateTitleIcon: React.PropTypes.func
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
    const divProps = Object.assign({}, this.props);
    delete divProps.active;
    delete divProps.compId;
    delete divProps.updateTitleIcon;

    let classes = {
      'tab-pane': true,
      'active': this.props.active,
      'inactive': !this.props.active
    };

    let child = React.Children.only(this.props.children);
    let extraProps = (child && child.type.propTypes && child.type.propTypes.updateTitleIcon) ?
    {updateTitleIcon: this.props.updateTitleIcon} : {};
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
