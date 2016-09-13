import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import classNames from 'classnames';
import Icon from 'ui/Icon';
import {HotKeys} from 'react-hotkeys'; // 0.9.0 needs {...}

let Modal = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    visible: React.PropTypes.bool,
    uncloseable: React.PropTypes.bool,
    onClose: React.PropTypes.func,
    children: React.PropTypes.element
  },

  getDefaultProps() {
    return {
      onClose: function() {
      },
      uncloseable: false,
      visible: true
    };
  },

  getInitialState() {
    return {
      icon: null,
      title: null
    };
  },

  componentDidMount() {
    this.componentDidUpdate();
  },

  /*eslint-disable react/no-did-update-set-state */   //It's ok here as it won't lead to thrashing and is the only way to do this
  componentDidUpdate() {
    let {child} = this.refs;
    if (child) {
      child.icon ? this.setState({icon: child.icon()}) : null;
      child.title ? this.setState({title: child.title()}) : null;
    }
  },
  /*eslint-enable react/no-did-update-set-state */

  handleClose(e) {
    if (!this.props.uncloseable) {
      e.preventDefault();
      e.stopPropagation();
      this.props.onClose();
    }
  },

  handleOverlayClick(e) {
    if (e.target === this.overlay && !this.props.uncloseable) {
      e.preventDefault();
      e.stopPropagation();
      if (this.props.onClose)
        this.props.onClose();
    }
  },

  render: function() {
    let {visible, uncloseable, children, onClose, ...other} = this.props;
    let {icon, title} = this.state;

    if (!children)
      return null;
    let classes = {
      modal: true,
      visible: visible
    };

    let hotKeysKeyMap = {
      'handleKonami': 'up up down down left right left right b a enter',
      'handleClose': ['escape'],
      'handleEnter': ['enter']
    };
    let hotKeysHandlers = {
      'handleKonami': (e) => { console.error('kong.am.i'); },
      'handleClose': (e) => { !uncloseable ? onClose() : null; },
      'handleEnter': (e) => { this.child && this.child.handleEnter ? this.child.handleEnter() : null; }
    };

    return (
      <HotKeys keyMap={hotKeysKeyMap} handlers={hotKeysHandlers}>
        <div className={classNames(classes)}
             ref={(node) => this.overlay = node}
             onClick={this.handleOverlayClick}>
          <div className="popup"
            {...other}>
            <div className="popup-header">
              {icon ? <Icon name={icon}/> : null}
              <div className="title">{title}</div>
              {!uncloseable ? <Icon className="pointer close" name="close" onClick={this.handleClose}/> : null}
            </div>
            <div className="popup-body">
              {React.cloneElement(children, {ref: (ref) => this.child = ref})}
            </div>
          </div>
        </div>
      </HotKeys>
    );
  }
});

module.exports = Modal;
