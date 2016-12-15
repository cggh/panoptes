import React from 'react';
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
    initialX: React.PropTypes.number,
    initialY: React.PropTypes.number,
    initialWidth: React.PropTypes.number,
    initialHeight: React.PropTypes.number,
    onMoveStop: React.PropTypes.func,
    onResizeStop: React.PropTypes.func,
    onClose: React.PropTypes.func,
    onMaximise: React.PropTypes.func,
    onClick: React.PropTypes.func,
    children: React.PropTypes.element,
  },

  getInitialState() {
    let {initialX, initialY, initialWidth, initialHeight} = this.props;
    return {
      x: initialX,
      y: initialY,
      width: initialWidth,
      height: initialHeight
    };
  },

  componentDidMount() {
    this.componentDidUpdate();
  },

  componentWillReceiveProps(nextProps) {
    let propNameToStateNameMap = {
      initialX: 'x',
      initialY: 'y',
      initialWidth: 'width',
      initialHeight: 'height'
    };
    _forEach(Object.keys(propNameToStateNameMap), (propName) => {
      if (nextProps[propName] !== this.props[propName]) {
        this.setState({[propNameToStateNameMap[propName]]: nextProps[propName]});
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
                 onStop={this.handleMoveStop}
                 position={{x, y}}>
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
