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
    initPosition: ImmutablePropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    }),
    initSize: ImmutablePropTypes.shape({
      w: React.PropTypes.number,
      h: React.PropTypes.number
    }),
    onMoveStop: React.PropTypes.func,
    onResizeStop: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      title: 'Popup',
      initPosition: Immutable.Map({
        x: 100,
        y: 100
      }),
      initSize: Immutable.Map({
        width: 300,
        height: 200
      })
    };
  },

  getInitialState() {
    return {size: this.props.initSize};
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
      this.props.onMoveStop({x:left, y:top})
  },

  render() {
    let { initPosition, initSize, title, faIcon, children, ...other } = this.props;
    return (
      <Draggable handle='.header'
                 start={initPosition.toObject()}
                 moveOnStartChange={true}
                 onStop={this.handleMoveStop}>
        <Resizable width={initSize.get('width')} height={initSize.get('height')}
                   minConstraints={[150, 150]}
                   maxConstraints={[500, 300]}
                   onResize={this.handleResize}
                   onResizeStop={this.handleResizeStop}>
          <div className="popup"
               style={this.state.size.toObject()}
               {...other}>
            <div className="header">
              {faIcon ? <Icon className='icon' name={faIcon}/> : null}
              {title}
            </div>
            <div className="body">
              {children}
            </div>
          </div>
        </Resizable>
      </Draggable>
    );
  }

});

module.exports = Popup;
