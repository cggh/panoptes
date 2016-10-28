import React from 'react';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import classnames from 'classnames';
import Icon from 'ui/Icon';


let ChannelWithConfigDrawer = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: ['onClose']
    })
  ],

  propTypes: {
    height: React.PropTypes.number,
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number,
    sideComponent: React.PropTypes.element,
    configComponent: React.PropTypes.element,
    legendComponent: React.PropTypes.element,
    onClose: React.PropTypes.func,
    children: React.PropTypes.element
  },

  getInitialState() {
    return {
      controlsOpen: false,
      legendOpen: false
    };
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
    let {height, width, sideWidth, onClose,
      sideComponent, configComponent, legendComponent} = this.props;
    let {controlsOpen, legendOpen} = this.state;

    let effWidth = width - sideWidth;

    return (
      <div className="channel-container">
        <div className="channel-side" style={{width: `${sideWidth}px`}}>
          <div className="side-component">
            {sideComponent}
          </div>
          {onClose ?
          <div className="close button">
            <Icon name="times" onClick={this.handleClose}/>
          </div>
            : null }
          {configComponent ?
            <div className="config button">
              <Icon className={classnames({open: controlsOpen})}
                    name="cog" onClick={this.handleControlToggle}/>
            </div>
            : null }
          {legendComponent ?
            <div className="legend button" ref="legendToggle">
              <Icon className={classnames({open: legendOpen})}
                    name="info" onClick={this.handleLegendToggle}/>
            </div>
            : null }
        </div>
        <div className="channel-stack">
          {configComponent ?
            <div className={classnames({open: controlsOpen, 'tray-container': true, 'config-container': true})} ref="controlsContainer">
              <div ref="controls" style={{width: `${effWidth}px`}}>
                {configComponent}
              </div>
            </div> : null }
          <div className="channel-data" style={{width: `${effWidth}px`, height: `${height}px`}}>
            {this.props.children}
          </div>
          {legendComponent ?
            <div className={classnames({open: legendOpen, 'tray-container': true, 'legend-container': true})} ref="legendContainer">
              <div ref="legend" style={{width: `${effWidth}px`}}>
                {legendComponent}
              </div>
            </div> : null }

        </div>
      </div>
    );
  }
});

export default ChannelWithConfigDrawer;

//          {this.props.onClose ? <Icon className="close" name="times" onClick={this.handleClose}/> : null}


//

//<div className="channel-data" style={{width: `${effWidth}px`}}>
//  {this.props.children}
//</div>




