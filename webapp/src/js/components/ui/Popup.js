const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const _ = require('lodash');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

const Draggable = require('react-draggable');
const Resizable = require('react-resizable').Resizable;
const Icon = require('ui/Icon');


let Popup = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    title: React.PropTypes.string, //Used in title bar
    faIcon: React.PropTypes.string,
    position: ImmutablePropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    }),
    size: ImmutablePropTypes.shape({
      w: React.PropTypes.number,
      h: React.PropTypes.number
    }),
    onMoveStop: React.PropTypes.func,
    onResizeStop: React.PropTypes.func,
    onClose: React.PropTypes.func,
    onClick: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      title: 'Popup',
      position: Immutable.Map({
        x: 100,
        y: 100
      }),
      size: Immutable.Map({
        width: 500,
        height: 400
      })
    };
  },

  getInitialState() {
    return {size: this.props.size};
  },

  handleResize(event, {element, size}) {
    this.setState(prev => ({
      size: prev.size.merge(size)
    }));
  },
  handleResizeStop(event, {element, size}) {
    if (this.props.onResizeStop)
      this.props.onResizeStop(size);
  },
  handleMoveStop(event, ui) {
    let {left, top} = ui.position;
    if (this.props.onMoveStop)
      this.props.onMoveStop({x:left, y:top});
  },
  handleClose(event) {
    if (this.props.onClose) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onClose();
    }
  },
  handleClick(event) {
    if (this.props.onClick)
      this.props.onClick(event);
  },

  render() {
    let { position, size, title, faIcon, children, ...other } = this.props;
    return (
      <Draggable handle='.popup-drag'
                 start={position.toObject()}
                 moveOnStartChange={true}
                 onStart={this.handleClick}
                 onStop={this.handleMoveStop}>
        <Resizable width={size.get('width')} height={size.get('height')}
                   minConstraints={[50, 50]}
                   handleSize={[20,20]}
                   onResize={this.handleResize}
                   onResizeStop={this.handleResizeStop}>
          <div className="popup"
               style={this.state.size.toObject()}
               {...other}>
            <div className="popup-header">
              {faIcon ? <Icon name={faIcon}/> : null}
              <div className="title">{title}</div>
              <Icon className="close" name="close" onClick={this.handleClose}/>
            </div>
            <div className="popup-body">
              {children}
            </div>
            <div className="popup-drag"></div>
          </div>
        </Resizable>
      </Draggable>
    );
  }

});

module.exports = Popup;
