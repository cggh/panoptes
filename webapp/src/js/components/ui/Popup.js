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
    onClick: React.PropTypes.func,
    children: React.PropTypes.element
  },

  getDefaultProps() {
    return {
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
    return {
      size: this.props.size,
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
      child.icon ? this.setState({icon:child.icon()}) : null;
      child.title ? this.setState({title:child.title()}) : null;
    }
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
    let { position, size, children, ...other } = this.props;
    let { icon, title } = this.state;
    if (!children)
      return null;
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
              {icon ? <Icon name={icon}/> : null}
              <div className="title">{title}</div>
              <Icon className="pointer close" name="close" onClick={this.handleClose}/>
            </div>
            <div className="popup-body">
              {React.addons.cloneWithProps(children, {ref: 'child' })}
            </div>
            <div className="popup-drag"></div>
          </div>
        </Resizable>
      </Draggable>
    );
  }

});

module.exports = Popup;
