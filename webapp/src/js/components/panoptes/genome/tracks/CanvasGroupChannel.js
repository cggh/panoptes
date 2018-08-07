import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import _isFinite from 'lodash.isfinite';
import _map from 'lodash.map';
import Hammer from 'react-hammerjs';

import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import YScale from 'panoptes/genome/tracks/YScale';


import {Motion, spring} from 'react-motion';
const DEFAULT_SPRING = {stiffness: 160, damping: 30};
const NO_SPRING = {stiffness: 2000, damping: 80};

let CanvasGroupChannel = createReactClass({
  displayName: 'CanvasGroupChannel',

  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'onTap',
        'onMouseMove',
        'onMouseOver',
        'onMouseOut',
        'onClose'
      ]
    })
  ],

  propTypes: {
    chromosome: PropTypes.string,
    start: PropTypes.number,
    end: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    sideWidth: PropTypes.number,
    autoYScale: PropTypes.bool,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
    side: PropTypes.element,
    controls: PropTypes.element,
    legend: PropTypes.element,
    onClose: PropTypes.func,
    onTap: PropTypes.func,
    onMouseOver: PropTypes.func,
    onMouseOut: PropTypes.func,
    onMouseMove: PropTypes.func,
    children: PropTypes.node
  },

  getDefaultProps() {
    return {
      height: 100,
      onTap: () => null,
      onMouseOver: () => null,
      onMouseOut: () => null,
      onMouseMove: () => null,
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

  handleYLimitChange(index, dataLimits, noAnimation) {
    noAnimation = true;
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
    if (_isFinite(allDataYMin) && _isFinite(allDataYMax) && this.refs.spring) {
      this.setState({
        dataYMin: allDataYMin,
        dataYMax: allDataYMax
        // springConfig: noAnimation ? NO_SPRING : DEFAULT_SPRING
      });
      if (this.props.autoYScale && noAnimation) {
        let endValue = {
          yMin: {val: allDataYMin, config: NO_SPRING},
          yMax: {val: allDataYMax, config: NO_SPRING},
          springConfig: NO_SPRING
        };
        this.refs.spring.setState({
          currentStyle: {yMin: allDataYMin, yMax: allDataYMax},
          currentVelocity: {yMin: 0, yMax: 0}
        });
        this.nextSpringConfig = NO_SPRING;
      }
    }
  },

  render() {
    let {width, height, sideWidth, yMin, yMax, autoYScale, side, controls, legend} = this.props;
    let {dataYMin, dataYMax} = this.state;
    let springConfig = (autoYScale && this.nextSpringConfig) || DEFAULT_SPRING;
    this.nextSpringConfig = null;
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
      yMin: spring(initYAxisSpring.yMin, springConfig),
      yMax: spring(initYAxisSpring.yMax, springConfig)
    };

    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={height}
        sideComponent={side}
        //Override component update to get latest in case of skipped render
        configComponent={controls}
        legendComponent={legend}
        onClose={this.handleClose}
      >
        <Motion ref="spring" style={yAxisSpring} defaultStyle={initYAxisSpring}>
          {(interpolated) => {
            let {yMin, yMax} = interpolated;
            return <Hammer onTap={this.redirectedProps.onTap}>
              <div
                className="numerical-channel-canvas-holder"
                style={this.props.style}
                onMouseOver={this.redirectedProps.onMouseOver}
                onMouseMove={this.redirectedProps.onMouseMove}
                onMouseOut={this.redirectedProps.onMouseOut}
              >
                <YScale width={width - sideWidth} height={height} min={yMin} max={yMax} />
                {React.Children.map(this.props.children, (child, index) => React.cloneElement(child, {
                  yMin,
                  yMax,
                  height,
                  onYLimitChange: ({dataYMin, dataYMax}) => this.handleYLimitChange(index, {dataYMin, dataYMax}),
                }))}
              </div>
            </Hammer>;
          }}
        </Motion>
      </ChannelWithConfigDrawer>);
  },
});


export default CanvasGroupChannel;


