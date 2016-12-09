import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Draggable from 'react-draggable';
import {Resizable} from 'react-resizable';
import 'react-resizable/css/styles.css';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';

// Panoptes
import Icon from 'ui/Icon';

// Lodash
import _forEach from 'lodash/forEach';

const TOPBAR_HEIGHT = 33; //Mirrors css variable

let Popup = React.createClass({
  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    className: React.PropTypes.string,
    style: React.PropTypes.object,
    x: React.PropTypes.number,
    y: React.PropTypes.number,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    onMoveStop: React.PropTypes.func,
    onResizeStop: React.PropTypes.func,
    onClose: React.PropTypes.func,
    onMaximise: React.PropTypes.func,
    onClick: React.PropTypes.func,
    children: React.PropTypes.element,
  },

  getDefaultProps() {
    return {
      x: 100,
      y: 100,
      width: 700,
      height: 500
    };
  },

  getInitialState() {
    let {x, y, width, height} = this.props;
    return {x, y, width, height};
  },

  componentDidMount() {
    this.componentDidUpdate();
  },

  componentWillReceiveProps(nextProps) {
    _forEach('x', 'y', 'width', 'height', (prop) => {
      if (nextProps[prop] !== this.props[prop]) {
        this.setState({[prop]: nextProps[prop]});
      }
    });
  },

  /*eslint-disable react/no-did-update-set-state*/
  componentDidUpdate() {
    let {child} = this.refs;
    if (child) {
      child.icon ? this.setState({icon: child.icon()}) : null;
      child.title ? this.setState({title: child.title()}) : null;
    }
  },
  /*eslint-enable react/no-did-update-set-state*/

  handleResize(event, {element, size}) { //eslint-disable-line no-unused-vars
    this.setState(size);
  },
  handleResizeStop(event, {element, size}) { //eslint-disable-line no-unused-vars
    this.setState(size);
    if (this.props.onResizeStop)
      this.props.onResizeStop(size);
  },
  handleMoveStop(event, pos) {
    let {x, y} = pos;
    this.setState({x, y});
    if (this.props.onMoveStop)
      this.props.onMoveStop({x, y});
  },
  handleClose(event) {
    if (this.props.onClose) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onClose();
    }
  },
  handleMaximise(event) {
    if (this.props.onMaximise) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onMaximise();
    }
  },
  handleClick(event) {
    if (this.props.onClick)
      this.props.onClick(event);
  },

  render() {
    let {children, className, style} = this.props;
    let {icon, title, x, y, width, height} = this.state;

    if (!children)
      return null;
    return (
      <Draggable handle=".popup-drag"
                 defaultPosition={{x, y}}
                 onStart={this.handleClick}
                 onStop={this.handleMoveStop}>
        <Resizable width={width} height={height}
                   minConstraints={[50, 50]}
                   handleSize={[20, 20]}
                   onResize={this.handleResize}
                   onResizeStop={this.handleResizeStop}>
          <div className={'popup ' + className}
               style={{...style, width, height}}
          >
            <div className="popup-header">
              {icon ? <Icon name={icon}/> : null}
              <div className="title">{title}</div>
              <Icon className="pointer close" name="folder-o" onClick={this.handleMaximise}/>
              <Icon className="pointer close" name="close" onClick={this.handleClose}/>
            </div>
            <div className="popup-body" style={{width, height: height - TOPBAR_HEIGHT}}>
              {React.cloneElement(children, {ref: 'child'})}
            </div>
            <div className="popup-drag"></div>
          </div>
        </Resizable>
      </Draggable>
    );
  }

});

export default Popup;
