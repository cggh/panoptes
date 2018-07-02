import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import {scale} from 'd3-scale';
import _isFinite from 'lodash.isfinite';

import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import YScale from 'panoptes/genome/tracks/YScale';


import {Motion, spring} from 'react-motion';

import findBlocks from 'panoptes/FindBlocks';

let ScaledSVGChannel = createReactClass({
  displayName: 'ScaledSVGChannel',

  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
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
    dataYMin: PropTypes.number,
    dataYMax: PropTypes.number,
    side: PropTypes.element,
    controls: PropTypes.element,
    legend: PropTypes.element,
    onClose: PropTypes.func,
    children: PropTypes.object
    //Note that there will be other props specific to each child channel
  },

  getDefaultProps() {
    return {
      height: 100
    };
  },

  handleClose() {
    if (this.redirectedProps.onClose)
      this.redirectedProps.onClose();
  },

  render() {
    let {start, end, width, height, sideWidth, yMin, yMax, autoYScale, dataYMin, dataYMax, side, controls, legend} = this.props;

    if (autoYScale) {
      if (_isFinite(dataYMin) && _isFinite(dataYMax)) {
        yMin = dataYMin;
        yMax = dataYMax;
      }
    }

    //If we go to a region with no data then don't move the y axis
    if (!_isFinite(yMin) && this.lastYMin)
      yMin = this.lastYMin;
    if (!_isFinite(yMax) && this.lastYMax)
      yMax = this.lastYMax;
    [this.lastYMin, this.lastYMax] = [yMin, yMax];

    if (width <= 0)
      return null;

    let effWidth = width - sideWidth;
    let scale = scaleLinear().domain([start, end]).range([0, effWidth]);
    let stepWidth = (scale(end) - scale(start)) / (end - start);
    let offset = scale(0) - scale(start + 0.5);

    let initYAxisSpring = {
      yMin: _isFinite(yMin) ? yMin : null,
      yMax: _isFinite(yMax) ? yMax : null
    };
    let yAxisSpring = {
      yMin: spring(initYAxisSpring.yMin),
      yMax: spring(initYAxisSpring.yMax)
    };

    let [[block1Start, block1End], [block2Start, block2End]] = findBlocks(start, end);
    //If we already are at an acceptable block then don't change it!
    if (!((this.blockEnd === block1End && this.blockStart === block1Start) ||
      (this.blockEnd === block2End && this.blockStart === block2Start))) {
      //Current block was unacceptable so choose best one
      this.blockStart = block1Start;
      this.blockEnd = block1End;
    }

    let blockPixelWidth = (((width - sideWidth) / 2) / (end - start)) * (this.blockEnd - this.blockStart);

    const Side = (props) => <div className="side-name">{side}</div>;

    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={height}
        sideComponent={<Side/>}
        //Override component update to get latest in case of skipped render
        configComponent={controls}
        legendComponent={legend}
        onClose={this.handleClose}
      >
        <svg className="numerical-channel" width={effWidth} height={height}>
          <Motion style={yAxisSpring} defaultStyle={initYAxisSpring}>
            {(interpolated) => {
              let {yMin, yMax} = interpolated;
              return (
                <g>
                  <g
                    transform={_isFinite(yMin) && _isFinite(yMax) ? `translate(${offset}, ${height + (yMin * (height / (yMax - yMin)))}) scale(${stepWidth},${-(height / (yMax - yMin))})` : ''}>
                    <rect className="origin-shifter" x={-effWidth} y={-height} width={2 * effWidth}
                      height={2 * height}/>
                    {React.Children.map(this.props.children, (child) => React.cloneElement(child, {
                      blockStart: this.blockStart,
                      blockEnd: this.blockEnd,
                      blockPixelWidth
                    }))}
                  </g>
                  <YScale min={yMin} max={yMax} width={effWidth} height={height}/>
                </g>
              );
            }}
          </Motion>
        </svg>
      </ChannelWithConfigDrawer>
    );
  },
});


export default ScaledSVGChannel;


