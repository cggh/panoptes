import React from 'react';
import ReactDOM from 'react-dom';
import PureRenderMixin from 'mixins/PureRenderMixin';
import offset from 'bloody-offset';

import Icon from 'ui/Icon';


let ChannelWithConfigDrawer = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    height: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    sideComponents: React.PropTypes.element,
    configComponents: React.PropTypes.element
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

  render() {
    let {height, width, sideWidth, sideComponents, configComponents} = this.props;
    let effWidth = width - sideWidth;

    return (
      <div className="channel-container">
        <div className="channel" style={{height: height}}>

          <div className="channel-side" style={{width: `${sideWidth}px`}}>
            <div className="side-controls">
              <Icon className="close" name="times" onClick={this.handleControlToggle}/>
              <Icon className="control-toggle" name="cog" onClick={this.handleControlToggle}/>
            </div>
            {sideComponents}
          </div>

          <div className="channel-data" style={{width: `${effWidth}px`}}>
            {this.props.children}
          </div>
        </div>

        <div ref="controlsContainer" className="channel-controls-container">
          <div ref="controls" className="channel-controls" style={{width: width + 'px'}}>
            {configComponents}
          </div>
        </div>
      </div>
    );
  }
});

module.exports = ChannelWithConfigDrawer;
