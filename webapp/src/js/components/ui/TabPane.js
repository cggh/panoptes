const React = require('react');
const classNames = require('classnames');
const PureRenderMixin = require('mixins/PureRenderMixin');

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
    let classes = {
      'tab-pane': true,
      'active': this.props.active
    };

    return (
      <div {...this.props} className={classNames(this.props.className, classes)}>
        {React.addons.cloneWithProps(this.props.children, {ref: 'child' })}
      </div>
    );
  }

});

module.exports = TabPane;
