const React = require('react');
const ValidComponentChildren = require('../utils/ValidComponentChildren');
const classNames = require('classnames');
const _ = require('lodash');
const PureRenderMixin = require('mixins/PureRenderMixin');
const Icon = require('ui/Icon');

let TabbedArea = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    activeTab: React.PropTypes.string,
    onSelect: React.PropTypes.func,
    onClose: React.PropTypes.func
  },

  handleClick(tabId, e) {
    if (this.props.onSelect) {
      e.preventDefault();
      this.props.onSelect(tabId);
    }
  },
  handleClose(tabId, event) {
    if (this.props.onClose) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onClose(tabId);
    }
  },

  getInitialState() {
    return {
      icons: {},
      titles: {}
    };
  },


  componentDidMount() {
    this.componentDidUpdate();
  },

  componentDidUpdate() {
    let icons = {};
    let titles = {};
    _.each(this.refs, (child, id) => {
      child.icon ? icons[id] = child.icon() : null;
      child.title ? titles[id] = child.title() : null;
    });
    if (!(_.isEqual(this.state.icons, icons) && _.isEqual(this.state.titles, titles)))
      this.setState({
        icons: icons,
        titles: titles
      });
  },

  renderTab(tab) {
    let {icons, titles} = this.state;
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
        {icons[id] ? <Icon name={icons[id]}/> : null}
        <div className="title">{titles[id]}</div>
        <Icon className="action close" name="close" onClick={this.handleClose.bind(this, id)}/>
      </div>
    )
  },

  renderPane(tab) {
    return React.cloneElement(
      tab,
      {
        active: (tab.props.compId === this.props.activeTab),
        key: tab.props.compId,
        ref: tab.props.compId
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
