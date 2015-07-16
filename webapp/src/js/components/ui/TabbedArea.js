const React = require('react');
const ValidComponentChildren = require('../utils/ValidComponentChildren');
const classNames = require('classnames');
const _ = require('lodash');
const PureRenderMixin = require('mixins/PureRenderMixin');
const Icon = require('ui/Icon');
const Draggable = require('react-draggable');

let TabbedArea = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    activeTab: React.PropTypes.string,
    onSelect: React.PropTypes.func,
    onClose: React.PropTypes.func
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
  handleAddTab(e) {
    if (this.props.onAddTab) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onAddTab();
    }
  },

  handleDragStop(id) {
    let state = this.refs['drag_'+id].state;
    let dist = Math.sqrt(state.clientY*state.clientY + state.clientX*state.clientX);
    this.refs['drag_'+id].resetState();
    if (dist > 100 && state.clientY > 50 && this.props.onDragAway)
      this.props.onDragAway(id, {
        x:state.clientX+state.offsetX,
        y:state.clientY+state.offsetY
      })
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
      <Draggable
        ref={"drag_"+id}
        key={id}
        onStop={this.handleDragStop.bind(this, id)}>
          <div className={classNames(classes)}
             onClick={this.handleClick.bind(this, id)}>
          {icons[id] ? <Icon name={icons[id]}/> : null}
          <div className="title">{titles[id]}</div>
          <Icon className="action close" name="close" onClick={this.handleClose.bind(this, id)}/>
        </div>
      </Draggable>
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
          {this.props.onAddTab ? <Icon name="plus-circle" onClick={this.handleAddTab}/> : null}
        </div>
        <div className="tab-content">
          {ValidComponentChildren.map(this.props.children, this.renderPane, this)}
        </div>
      </div>
    )
  }
});

module.exports = TabbedArea;
