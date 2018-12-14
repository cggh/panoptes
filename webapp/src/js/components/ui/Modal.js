import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import classNames from 'classnames';
import Icon from 'ui/Icon';
import {HotKeys} from 'react-hotkeys'; // 0.9.0 needs {...}

let Modal = createReactClass({
  displayName: 'Modal',

  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    visible: PropTypes.bool,
    uncloseable: PropTypes.bool,
    onClose: PropTypes.func,
    children: PropTypes.element
  },

  getDefaultProps() {
    return {
      onClose() {
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
    if (this.child) {
      this.setState({icon: this.child.icon ? this.child.icon() : null});
      this.setState({title: this.child.title ? this.child.title() : null});
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

  render() {
    let {visible, uncloseable, children, onClose, ...other} = this.props;
    let {icon, title} = this.state;

    if (!children)
      return null;
    let classes = {
      modal: true,
      visible
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
              {!uncloseable ? <Icon className="pointer close" name="close" onClick={this.handleClose} title="Cancel and close"/> : null}
            </div>
            <div className="popup-body">
              {React.cloneElement(children, {ref: (ref) => this.child = ref})}
            </div>
          </div>
        </div>
      </HotKeys>
    );
  },
});

export default Modal;
