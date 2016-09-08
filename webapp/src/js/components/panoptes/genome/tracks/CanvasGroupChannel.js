import React from 'react';
import d3 from 'd3';
import _isFinite from 'lodash/isFinite';
import _map from 'lodash/map';

import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import YScale from 'panoptes/genome/tracks/YScale';


import {Motion, spring} from 'react-motion';

let CanvasGroupChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'onClose'
      ]
    })
  ],

  propTypes: {
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number,
    sideWidth: React.PropTypes.number.isRequired,
    autoYScale: React.PropTypes.bool,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number,
    side: React.PropTypes.element,
    controls: React.PropTypes.element,
    legend: React.PropTypes.element,
    onClose: React.PropTypes.func,
    children: React.PropTypes.object
  },

  getDefaultProps() {
    return {
      height: 100
    };
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.yLimits = {};
  },

  handleClose() {
    if (this.redirectedProps.onClose)
      this.redirectedProps.onClose();
  },

  handleYLimitChange(index, dataLimits) {
    this.yLimits[index] = dataLimits;
    let allDataYMin = null;
    let allDataYMax = null;
    _map(this.yLimits, ({dataYMin, dataYMax}) => {
      if (!_isFinite(allDataYMin) || (_isFinite(dataYMin) && dataYMin < allDataYMin)) {
        allDataYMin = dataYMin;
      }
      if (!_isFinite(allDataYMax) || (_isFinite(dataYMax) && dataYMax > allDataYMax)) {
        allDataYMax = dataYMax;
      }
    });
    if (_isFinite(allDataYMin) && _isFinite(allDataYMax)) {
      this.setState({dataYMin: allDataYMin, dataYMax: allDataYMax});
    }
  },

  render() {
    let {width, height, sideWidth, yMin, yMax, autoYScale, side, controls, legend} = this.props;
    let {dataYMin, dataYMax} = this.state;

    if (autoYScale) {
      if (_isFinite(dataYMin) && _isFinite(dataYMax)) {
        yMin = dataYMin;
        yMax = dataYMax;
      }
    }

    //If we go to a region with no data then don't move the y axis
    if (!_isFinite(yMin) && _isFinite(this.lastYMin))
      yMin = this.lastYMin;
    if (!_isFinite(yMax) && _isFinite(this.lastYMax))
      yMax = this.lastYMax;
    [this.lastYMin, this.lastYMax] = [yMin, yMax];

    if (width <= 0)
      return null;

    let initYAxisSpring = {
      yMin: _isFinite(yMin) ? yMin : null,
      yMax: _isFinite(yMax) ? yMax : null
    };
    let yAxisSpring = {
      yMin: spring(initYAxisSpring.yMin),
      yMax: spring(initYAxisSpring.yMax)
    };

    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={height}
        sideComponent={<div className="side-name">{side}</div>}
        //Override component update to get latest in case of skipped render
        configComponent={controls}
        legendComponent={legend}
        onClose={this.handleClose}
      >
          <Motion style={yAxisSpring} defaultStyle={initYAxisSpring}>
            {(interpolated) => {
              let {yMin, yMax} = interpolated;
              return <div className="numerical-channel-canvas-holder">
                <YScale width={width - sideWidth} height={height} min={yMin} max={yMax} />
                {React.Children.map(this.props.children, (child, index) => React.cloneElement(child, {
                yMin,
                yMax,
                height,
                onYLimitChange: ({dataYMin, dataYMax}) => this.handleYLimitChange(index, {dataYMin, dataYMax}),
                  }))}
              </div>;
            }}
          </Motion>
      </ChannelWithConfigDrawer>);
  }
});


module.exports = CanvasGroupChannel;


