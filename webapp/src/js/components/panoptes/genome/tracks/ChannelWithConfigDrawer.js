import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import classnames from 'classnames';
import Icon from 'ui/Icon';


let ChannelWithConfigDrawer = createReactClass({
  displayName: 'ChannelWithConfigDrawer',

  mixins: [
    PureRenderWithRedirectedProps({
      redirect: ['onClose']
    })
  ],

  propTypes: {
    height: PropTypes.number,
    width: PropTypes.number,
    sideWidth: PropTypes.number,
    sideComponent: PropTypes.element,
    configComponent: PropTypes.element,
    legendComponent: PropTypes.element,
    onClose: PropTypes.func,
    children: PropTypes.element
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
    let side = React.cloneElement(sideComponent, {onLegendToggle: this.handleLegendToggle});
    return (
      <div className="channel-container">
        <div className="channel-side" style={{width: `${sideWidth}px`}}>
          <div className="side-component">
            {side}
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
            <div className="legend button">
              <Icon className={classnames({open: legendOpen})}
                name="info" onClick={this.handleLegendToggle}/>
            </div>
            : null }
        </div>
        <div className="channel-stack">
          {configComponent ?
            <div className={classnames({open: controlsOpen, 'tray-container': true, 'config-container': true})}>
              <div style={{width: `${effWidth}px`}}>
                {configComponent}
              </div>
            </div> : null }
          <div className="channel-data" style={{width: `${effWidth}px`, height: `${height}px`}}>
            {this.props.children}
          </div>
          {legendComponent ?
            <div className={classnames({open: legendOpen, 'tray-container': true, 'legend-container': true})}>
              <div style={{width: `${effWidth}px`}}>
                {legendComponent}
              </div>
            </div> : null }

        </div>
      </div>
    );
  },
});

export default ChannelWithConfigDrawer;

//          {this.props.onClose ? <Icon className="close" name="times" onClick={this.handleClose}/> : null}


//

//<div className="channel-data" style={{width: `${effWidth}px`}}>
//  {this.props.children}
//</div>
