import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import ValidComponentChildren from 'util/ValidComponentChildren';
import classNames from 'classnames';
import _isEqual from 'lodash.isequal';
import _forEach from 'lodash.foreach';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Icon from 'ui/Icon';
import Draggable from 'react-draggable';
import filterChildren from 'util/filterChildren';
import _assign from 'lodash.assign';
import Immutable from 'immutable';

let TabbedArea = createReactClass({
  displayName: 'TabbedArea',
  mixins: [PureRenderMixin],

  propTypes: {
    activeTab: PropTypes.string,
    unclosableTabs: PropTypes.object,
    unreplaceableTabs: PropTypes.object,
    onSwitch: PropTypes.func,
    onClose: PropTypes.func,
    onDragAway: PropTypes.func,
    onAddTab: PropTypes.func,
    children: PropTypes.node

  },

  getInitialState() {
    return {
      icons: {},
      titles: {},
      dragging: false
    };
  },

  getDefaultProps() {
    return {
      unclosableTabs: Immutable.List(),
      unreplaceableTabs: Immutable.List()
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
        icons,
        titles
      });
  },

  /*eslint-enable react/no-did-update-set-state*/

  handleClick(tabId, e) {
    if (this.props.onSwitch) {
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

  handleAddTab(event) {
    if (this.props.onAddTab) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onAddTab();
    }
  },

  handleDragStop(id) {
    let state = this.refs[`drag_${id}`].state;
    let dist = Math.sqrt(state.y * state.y + state.x * state.x);
    if (dist > 100 && state.y > 50 && this.props.onDragAway) {
      this.props.onDragAway(id, {
        x: state.x,
        y: state.y
      });
      return false;
    } else {
      this.refs[`drag_${id}`].setState({
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
      closeIcon = <Icon className="action close" name="times" onClick={this.handleClose.bind(this, id)}/>;
    }

    let tabMarkup = (
      <div className={classNames(classes)} onClick={this.handleClick.bind(this, id)}>
        {icons[id] ? <Icon name={icons[id]}/> : null}
        <div className="title">{titles[id]}</div>
        {this.props.unclosableTabs.indexOf(id) === -1 ?
          closeIcon
          : null}
      </div>
    );

    if (this.props.onDragAway && this.props.unclosableTabs.indexOf(id) === -1) {
      // Wrap tabMarkup in Draggable
      tabMarkup = (
        <Draggable
          ref={`drag_${id}`}
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
        ref: tab.props.compId,
        updateTitleIcon: () => this.forceUpdate(),
        replaceable: (this.props.unreplaceableTabs.indexOf(tab.props.compId) === -1 ? true : false)
      });
  },

  render() {
    const divProps = _assign({}, this.props);
    delete divProps.unclosableTabs;
    delete divProps.unreplaceableTabs;
    delete divProps.activeTab;
    delete divProps.onSwitch;
    delete divProps.onClose;
    delete divProps.onAddTab;
    delete divProps.onDragAway;
    const children = filterChildren(this, this.props.children);

    return (
      <div {...divProps} className="tabbed-area">
        <div className="tabs">
          {ValidComponentChildren.map(children, this.renderTab, this)}
          {this.props.onAddTab ? <Icon className="pointer" name="plus-circle" onClick={this.handleAddTab}/> : null}
        </div>
        <div className="tab-content" onClick={(e) => this.handleClick(this.props.activeTab, e)}>
          {ValidComponentChildren.map(children, this.renderPane, this)}
        </div>
      </div>
    );
  },
});

export default TabbedArea;
