import React from 'react';
import ValidComponentChildren from '../utils/ValidComponentChildren';
import classNames from 'classnames';
import _ from 'lodash';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Icon from 'ui/Icon';
import Draggable from 'react-draggable';

let TabbedArea = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    activeTab: React.PropTypes.string,
    onSwitch: React.PropTypes.func,
    onClose: React.PropTypes.func,
    onDragAway: React.PropTypes.func
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
    if (this.props.onSwitch) {
      e.preventDefault();
      this.props.onSwitch(tabId);
    }
  },
  handleClose(tabId, event) {
    if (this.props.onClose) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onClose(tabId);
    }
  },
  handleAddTab() {
    if (this.props.onAddTab) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onAddTab();
    }
  },

  handleDragStop(id) {
    let state = this.refs['drag_' + id].state;
    let dist = Math.sqrt(state.clientY * state.clientY + state.clientX * state.clientX);
    this.refs['drag_' + id].resetState();
    if (dist > 100 && state.clientY > 50 && this.props.onDragAway)
      this.props.onDragAway(id, {
        x: state.clientX + state.offsetX,
        y: state.clientY + state.offsetY
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

    let closeIcon = '';
    if (this.props.onClose) {
      closeIcon = <Icon className="action close" name="close" onClick={this.handleClose.bind(this, id)}/>;
    }

    let tabMarkup = (
          <div className={classNames(classes)} onClick={this.handleClick.bind(this, id)}>
            {icons[id] ? <Icon name={icons[id]}/> : null}
            <div className="title">{titles[id]}</div>
            {closeIcon}
          </div>
    );

    if (this.props.onDragAway) {
      // Wrap tabMarkup in Draggable
      tabMarkup = (
        <Draggable
          ref={'drag_' + id}
          key={id}
          zIndex={99999}
          onStop={this.handleDragStop.bind(this, id)}>
        {tabMarkup}
        </Draggable>
      );

    }

    return tabMarkup;
  },

  renderPane(tab) {
    return React.cloneElement(
      tab,
      {
        active: (tab.props.compId === this.props.activeTab),
        key: tab.props.compId,
        ref: tab.props.compId
      });
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
    );
  }
});

module.exports = TabbedArea;
