const React = require('react');
const ReactDOM =require('react-dom');
const PureRenderMixin = require('mixins/PureRenderMixin');
const classNames = require('classnames');
const Icon = require('ui/Icon');
const Hotkey = require('react-hotkey');
Hotkey.activate();
const keycodes = require('keycodes');

var Modal = React.createClass({
  mixins: [
    PureRenderMixin,
    Hotkey.Mixin('handleHotkey')
  ],

  propTypes: {
    visible: React.PropTypes.bool,
    unclosable: React.PropTypes.bool,
    onClose: React.PropTypes.func,
    children: React.PropTypes.element
  },

  getDefaultProps() {
    return {
      onClose: function () {
      },
      closable: true,
      visible: true
    };
  },

  getInitialState() {
    return {
      icon: null,
      title: null
    }
  },

  componentDidMount() {
    this.componentDidUpdate();
  },

  componentDidUpdate() {
    let {child} = this.refs;
    if (child) {
      child.icon ? this.setState({icon:child.icon()}) : null;
      child.title ? this.setState({title:child.title()}) : null;
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

  handleHotkey(e) {
    let {child} = this.refs;
    if (e.keyCode == keycodes('escape') && !this.props.uncloseable) {
      e.preventDefault();
      e.stopPropagation();
      this.props.onClose();
    } else if (e.keyCode == keycodes('enter') && child && child.handleEnter) {
      e.preventDefault();
      e.stopPropagation();
      child.handleEnter();
    }
  },

  render: function () {
    let { visible, unclosable, onClose, children, ...other } = this.props;
    let { icon, title } = this.state;
    if (!children)
      return null;
    let classes = {
      modal: true,
      visible: visible
    };
    return (
      <div className={classNames(classes)}
           ref='overlay'
           onClick={this.handleOverlayClick}>
        <div className="popup"
          {...other}>
          <div className="popup-header">
            {icon ? <Icon name={icon}/> : null}
            <div className="title">{title}</div>
            {!unclosable ? <Icon className="pointer close" name="close" onClick={this.handleClose}/> : null}
          </div>
          <div className="popup-body">
            {React.cloneElement(children, {ref: 'child' })}
          </div>
        </div>
      </div>)
  }
});

module.exports = Modal;
