import React from 'react';
import ReactDOM from 'react-dom';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import offset from 'bloody-offset';
import classnames from 'classnames';

import Icon from 'ui/Icon';


let ChannelWithConfigDrawer = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: ['onClose']
    })
  ],

  propTypes: {
    height: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    sideComponent: React.PropTypes.element,
    configComponent: React.PropTypes.element,
    onClose: React.PropTypes.func
  },

  getInitialState() {
    return {
      controlsOpen: false
    };
  },

  componentDidUpdate(prevProps, prevState) {
    if (prevState.controlsOpen !== this.state.controlsOpen)
      this.updateControlsHeight();
  },

  updateControlsHeight() {
    let height = offset(ReactDOM.findDOMNode(this.refs.controls)).height + 'px';
    this.refs.controlsContainer.style.height = this.state.controlsOpen ? height : 0;
    this.refs.controlsContainer.style.width = this.state.controlsOpen ?
      '100%' : this.props.sideWidth + 'px';
    //Ugly hack to ensure that dropdown boxes don't get snipped, I'm so sorry.
    if (!this.state.controlsOpen) {
      this.refs.controlsContainer.style.overflow = 'hidden';
      clearTimeout(this.controlOverFlowTimeout);
    }
    else
      this.controlOverFlowTimeout = setTimeout(() => this.refs.controlsContainer.style.overflow = 'visible', 500);
  },

  handleControlToggle(e) {
    this.setState({controlsOpen: !this.state.controlsOpen});
    e.stopPropagation();
  },

  handleClose(e) {
    e.stopPropagation();
    if (this.redirectedProps.onClose)
      this.redirectedProps.onClose();
  },

  render() {
    let {height, width, sideWidth, sideComponent, configComponent} = this.props;
    let {controlsOpen} = this.state;

    let effWidth = width - sideWidth;

    return (
      <div className="channel-container">
        <div ref="controlsContainer" className="channel-controls-container">
          <div ref="controls" style={{width: width + 'px'}}>
            {configComponent}
          </div>
        </div>
        <div className="channel" style={{height: height}}>
          <div className="channel-side" style={{width: `${sideWidth}px`}}>
            <div className="side-controls-spacer"></div>
            {sideComponent}
          </div>
          <div className="channel-data" style={{width: `${effWidth}px`}}>
            {this.props.children}
          </div>
        </div>
        <div className="side-controls">
          <Icon className="close" name="times" onClick={this.handleClose}/>
          <Icon className={classnames({"control-toggle":true, open:controlsOpen})}
                name="cog" onClick={this.handleControlToggle}/>
        </div>
      </div>
    );
  }
});

module.exports = ChannelWithConfigDrawer;
