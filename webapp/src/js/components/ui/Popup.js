import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Draggable from 'react-draggable';
import {Resizable} from 'react-resizable';
import 'react-resizable/css/styles.css';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Panoptes
import Icon from 'ui/Icon';

let Popup = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    StoreWatchMixin('SessionStore')
  ],

  propTypes: {
    initialPosition: ImmutablePropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    }),
    initialSize: ImmutablePropTypes.shape({
      width: React.PropTypes.number,
      height: React.PropTypes.number
    }),
    onMoveStop: React.PropTypes.func,
    onResizeStop: React.PropTypes.func,
    onClose: React.PropTypes.func,
    onMaximise: React.PropTypes.func,
    onClick: React.PropTypes.func,
    children: React.PropTypes.element,
    cascadePositionOffset: ImmutablePropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    })
  },

  getDefaultProps() {
    return {
      initialPosition: Immutable.Map({
        x: 100,
        y: 100
      }),
      initialSize: Immutable.Map({
        width: 700,
        height: 500
      }),
      cascadePositionOffset: Immutable.Map({
        x: 20,
        y: 20
      })
    };
  },

  getInitialState() {
    return {
      position: this.props.initialPosition,
      size: this.props.initialSize,
      icon: null,
      title: null
    };
  },

  getStateFromFlux() {
    return {
      numberOfPopups: this.getFlux().store('SessionStore').getState().get('popups').getIn(['components']).size
    };
  },

  setPosition() {
    // Depending on the current number of popups,
    // set the position of this popup according to the wrapping-cascade pattern.

    // Prevent popups overlapping by incrementally offsetting the position by the cascadePositionOffset (x, y).
    // Prevent offset popups falling outside the viewport by starting a new cascade,
    //   firstly at initialPosition (x, y) + cascadePositionOffset.get('x'), then at initialPosition (x, y) + (2 * cascadePositionOffset.get('x')), ...
    // Prevent the first popup of a new cascade falling outside the viewport by restarting the cascade at initialPosition (x, y).

    let positionOffsetX = (this.state.numberOfPopups - 1) * this.props.cascadePositionOffset.get('x');
    let positionOffsetY = (this.state.numberOfPopups - 1) * this.props.cascadePositionOffset.get('y');

    let maxPopupsDown = Math.floor((window.innerHeight - this.props.initialPosition.get('y') - this.props.initialSize.get('height')) / this.props.cascadePositionOffset.get('y'));
    let maxPopupsRight = Math.floor((window.innerWidth - this.props.initialPosition.get('x') - this.props.initialSize.get('width')) / this.props.cascadePositionOffset.get('x'));

    if (maxPopupsDown > 0) {

      let cascadeRow = Math.floor(this.state.numberOfPopups / maxPopupsDown);
      if (this.state.numberOfPopups % maxPopupsDown === 0) {
        cascadeRow = cascadeRow - 1;
      }

      positionOffsetX = positionOffsetX - (cascadeRow * (maxPopupsDown - 1) * this.props.cascadePositionOffset.get('x'));
      positionOffsetY = positionOffsetY - (cascadeRow * maxPopupsDown * this.props.cascadePositionOffset.get('y'));
    }

    let positionX = this.props.initialPosition.get('x') + positionOffsetX;
    let positionY = this.props.initialPosition.get('y') + positionOffsetY;

    this.setState({position: Immutable.Map({x: positionX, y: positionY})});
    // TODO: persist state after refresh
  },

  componentWillMount() {
    this.setPosition();
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

  handleResize(event, {element, size}) { //eslint-disable-line no-unused-vars
    this.setState((prev) => ({
      size: prev.size.merge(size)
    }));
  },
  handleResizeStop(event, {element, size}) { //eslint-disable-line no-unused-vars
    if (this.props.onResizeStop)
      this.props.onResizeStop(size);
  },
  handleMoveStop(event, ui) {
    let {x, y} = ui;
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
    let {children, ...other} = this.props;
    let {icon, title, position, size} = this.state;

    if (!children)
      return null;
    return (
      <Draggable handle=".popup-drag"
                 defaultPosition={position.toObject()}
                 onStart={this.handleClick}
                 onStop={this.handleMoveStop}>
        <Resizable width={size.get('width')} height={size.get('height')}
                   minConstraints={[50, 50]}
                   handleSize={[20, 20]}
                   onResize={this.handleResize}
                   onResizeStop={this.handleResizeStop}>
          <div className="popup"
               style={size.toObject()}
               {...other}>
            <div className="popup-header">
              {icon ? <Icon name={icon}/> : null}
              <div className="title">{title}</div>
              <Icon className="pointer close" name="folder-o" onClick={this.handleMaximise}/>
              <Icon className="pointer close" name="close" onClick={this.handleClose}/>
            </div>
            <div className="popup-body">
              {React.cloneElement(children, {ref: 'child'})}
            </div>
            <div className="popup-drag"></div>
          </div>
        </Resizable>
      </Draggable>
    );
  }

});

module.exports = Popup;
