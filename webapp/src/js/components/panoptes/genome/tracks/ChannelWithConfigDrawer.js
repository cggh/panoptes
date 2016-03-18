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
      controlsOpen: false,
      legendOpen: false
    };
  },

  componentDidUpdate(prevProps, prevState) {
    if (['width', 'sideWidth','height'].some((name) => prevProps[name] !== this.props[name]) ||
      ['controlsOpen', 'legendOpen'].some((name) => prevState[name] !== this.state[name])
    )
      this.updateControlsHeight();
    if (prevState.controlsOpen !== this.state.controlsOpen)
      this.visibilityHack();

  },

  updateControlsHeight() {
    if (this.refs.controls) {
      let height = offset(ReactDOM.findDOMNode(this.refs.controls)).height + 'px';
      this.refs.controlsContainer.style.height = this.state.controlsOpen ? height : 0;
    }
    if (this.refs.legend) {
      let height = offset(ReactDOM.findDOMNode(this.refs.legend)).height + 'px';
      this.refs.legendContainer.style.height = this.state.legendOpen ? height : 0;
      this.refs.legendToggle.style.bottom = this.state.legendOpen ? height : 0;
    }
  },


  //Ugly hack to ensure that dropdown boxes don't get snipped, I'm so sorry.
  visibilityHack() {
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

  handleLegendToggle(e) {
    this.setState({legendOpen: !this.state.legendOpen});
    e.stopPropagation();
  },

  handleClose(e) {
    e.stopPropagation();
    if (this.redirectedProps.onClose)
      this.redirectedProps.onClose();
  },

  render() {
    let {height, width, sideWidth, sideComponent, configComponent} = this.props;
    let {controlsOpen, legendOpen} = this.state;

    let effWidth = width - sideWidth;

    return (
      <div className="channel-container">
        <div className="channel-side" style={{width: `${sideWidth}px`}}>
          {configComponent ?
            <div className="config toggle">
              <Icon className={classnames({'control-toggle': true, open: controlsOpen})}
                    name="cog" onClick={this.handleControlToggle}/>
            </div>
            : null }
          {configComponent ?
            <div className="legend toggle" ref="legendToggle">
              <Icon className={classnames({'legend-toggle': true, open: legendOpen})}
                    name="info" onClick={this.handleLegendToggle}/>
            </div>
            : null }
          <div className="side-component">
            {sideComponent}
          </div>
        </div>
        <div className="channel-stack">
          {configComponent ?
            <div className="tray-container" ref="controlsContainer">
              <div ref="controls" style={{width: `${effWidth}px`}}>
                {configComponent}
              </div>
            </div> : null }
          <div className="channel-data" style={{width: `${effWidth}px`}}>
            {this.props.children}
          </div>
          {configComponent ?
            <div className="tray-container" ref="legendContainer">
              <div ref="legend" style={{width: `${effWidth}px`}}>
                {configComponent}
              </div>
            </div> : null }

        </div>
      </div>
    );
  }
});

module.exports = ChannelWithConfigDrawer;

//          {this.props.onClose ? <Icon className="close" name="times" onClick={this.handleClose}/> : null}


//

//<div className="channel-data" style={{width: `${effWidth}px`}}>
//  {this.props.children}
//</div>




