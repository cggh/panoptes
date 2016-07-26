import React from 'react';
import ValidComponentChildren from '../utils/ValidComponentChildren';
import classNames from 'classnames';
import _isEqual from 'lodash/isEqual';
import _forEach from 'lodash/forEach';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Icon from 'ui/Icon';
import Draggable from 'react-draggable';

let TabbedArea = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    activeTab: React.PropTypes.string,
    unclosableTab: React.PropTypes.string,
    onSwitch: React.PropTypes.func,
    onClose: React.PropTypes.func,
    onDragAway: React.PropTypes.func,
    onAddTab: React.PropTypes.func,
    children: React.PropTypes.object
  },

  getInitialState() {
    return {
      icons: {},
      titles: {},
      dragging: false
    };
  },


  componentDidMount() {
    this.componentDidUpdate();
  },


  /*eslint-disable react/no-did-update-set-state*/
  componentDidUpdate() {
    let icons = {};
    let titles = {};
    _forEach(this.refs, (child, id) => {
      child.icon ? icons[id] = child.icon() : null;
      child.title ? titles[id] = child.title() : null;
    });
    if (!(_isEqual(this.state.icons, icons) && _isEqual(this.state.titles, titles)))
      this.setState({
        icons: icons,
        titles: titles
      });
  },
  /*eslint-enable react/no-did-update-set-state*/

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
    let dist = Math.sqrt(state.y * state.y + state.x * state.x);
    if (dist > 100 && state.y > 50 && this.props.onDragAway) {
      this.props.onDragAway(id, {
        x: state.x,
        y: state.y
      });
      return false;
    } else {
      this.refs['drag_' + id].setState({
        dragging: false,
        x: 0,
        y: 0
      });
    }
    this.setState({dragging: false});
  },

  renderTab(tab) {
    let {icons, titles} = this.state;
    let id = tab.props.compId;
    let classes = {
      tab: true,
      active: (id === this.props.activeTab),
      inactive: (id !== this.props.activeTab),
      dragging: (id === this.state.dragging)
    };

    let closeIcon = '';
    if (this.props.onClose) {
      closeIcon = <Icon className="action close" name="close" onClick={this.handleClose.bind(this, id)}/>;
    }

    let tabMarkup = (
          <div className={classNames(classes)} onClick={this.handleClick.bind(this, id)}>
            {icons[id] ? <Icon name={icons[id]}/> : null}
            <div className="title">{titles[id]}</div>
            {this.props.unclosableTab !== id ?
              closeIcon
            : null}
          </div>
    );

    if (this.props.onDragAway && this.props.unclosableTab !== id) {
      // Wrap tabMarkup in Draggable
      tabMarkup = (
        <Draggable
          ref={'drag_' + id}
          key={id}
          defaultPosition={{x: 0, y: 0}}
          onStop={() => this.handleDragStop(id)}
          onDrag={() => this.setState({dragging: id})}
        >
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
    const divProps = Object.assign({}, this.props);
    delete divProps.unclosableTab;
    delete divProps.activeTab;
    delete divProps.onSwitch;
    delete divProps.onClose;
    delete divProps.onAddTab;
    delete divProps.onDragAway;

    return (
      <div {...divProps} className="tabbed-area">
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
