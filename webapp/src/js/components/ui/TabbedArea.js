const React = require('react');
const ValidComponentChildren = require('../utils/ValidComponentChildren');
const classNames = require('classnames');
const PureRenderMixin = require('mixins/PureRenderMixin');

let TabbedArea = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    activeTab: React.PropTypes.string,
    onSelect: React.PropTypes.func
  },

  handleClick(tabId, e) {
    if (this.props.onSelect) {
      e.preventDefault();
      this.props.onSelect(tabId);
    }
  },

  renderTab(tab) {
    let id = tab.props.compId;
    let classes = {
      tab: true,
      active: (id === this.props.activeTab),
      inactive: (id !== this.props.activeTab)
    };
    return (
      <div className={classNames(classes)}
           key = {id}
           onClick={this.handleClick.bind(this, id)}>
        {tab.props.title}
      </div>
    )
  },

  renderPane(tab) {
    return React.cloneElement(
      tab,
      {
        active: (tab.props.compId === this.props.activeTab),
        key: tab.props.compId
      })
  },

  render() {
    return (
      <div {...this.props} className="tabbed-area">
        <div className="tabs">
          {ValidComponentChildren.map(this.props.children, this.renderTab, this)}
        </div>
        <div className="tab-content">
          {ValidComponentChildren.map(this.props.children, this.renderPane, this)}
        </div>
      </div>
    )
  }
});

module.exports = TabbedArea;
