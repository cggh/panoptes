const React = require('react');
const classNames = require('classnames');
const PureRenderMixin = require('mixins/PureRenderMixin');

let TabPane = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    title: React.PropTypes.string,
    active: React.PropTypes.bool //Usually set by TabbedArea
  },

  render() {
    let classes = {
      'tab-pane': true,
      'active': this.props.active
    };

    return (
      <div {...this.props} className={classNames(this.props.className, classes)}>
        {this.props.children}
      </div>
    );
  }

});

module.exports = TabPane;
