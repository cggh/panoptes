import React from 'react';
import ReactDOM from 'react-dom';
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
    unclosable: React.PropTypes.bool,
    onClose: React.PropTypes.func,
    children: React.PropTypes.element
  },

  getDefaultProps() {
    return {
      onClose: function() {
      },
      closable: true,
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

  componentDidUpdate() {
    let {child} = this.refs;
    if (child) {
      child.icon ? this.setState({icon: child.icon()}) : null;
      child.title ? this.setState({title: child.title()}) : null;
    }
  },

  handleClose(e) {
    if (!this.props.uncloseable) {
      e.preventDefault();
      e.stopPropagation();
      this.props.onClose();
    }
  },

  handleOverlayClick(e) {
    if (e.target === ReactDOM.findDOMNode(this.refs.overlay) && this.props.closable) {
      e.preventDefault();
      e.stopPropagation();
      if (this.props.onClose)
        this.props.onClose();
    }
  },

  render: function() {
    let {visible, unclosable, children, onClose, closable, ...other} = this.props;
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
      'handleClose': (e) => { closable ? onClose() : null; },
      'handleEnter': (e) => { this.child && this.child.handleEnter ? this.child.handleEnter() : null; }
    };

    return (
      <HotKeys keyMap={hotKeysKeyMap} handlers={hotKeysHandlers}>
        <div className={classNames(classes)}
             ref="overlay"
             onClick={this.handleOverlayClick}>
          <div className="popup"
            {...other}>
            <div className="popup-header">
              {icon ? <Icon name={icon}/> : null}
              <div className="title">{title}</div>
              {!unclosable ? <Icon className="pointer close" name="close" onClick={this.handleClose}/> : null}
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
