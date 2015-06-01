const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const classNames = require('classnames');

var Modal = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    visible: React.PropTypes.bool,
    closable: React.PropTypes.bool,
    title: React.PropTypes.string, //Used in title bar
    faIcon: React.PropTypes.string,
    onClose: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      onClose: function () {
      },
      closable: true,
      visible: true
    };
  },

  handleClose(e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.onClose();
  },

  handleOverlayClick(e) {
    if (e.target === this.refs.overlay.getDOMNode() && this.props.closable) {
      e.preventDefault();
      e.stopPropagation();
      if (this.props.onClose)
        this.props.onClose();
    }
  },

  render: function () {
    let { visible, closable, onClose, faIcon, title, children, ...other } = this.props;
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
          <div className="header">
            {faIcon ? <Icon className='icon' name={faIcon}/> : null}
            {title}
          </div>
          <div className="body">
            {children}
          </div>
        </div>
      </div>)
  }
});

module.exports = Modal;