import React from 'react';
import d3 from 'd3';
import _isFinite from 'lodash/isFinite';

import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import YScale from 'panoptes/genome/tracks/YScale';


import {Motion, spring} from 'react-motion';

import findBlocks from 'panoptes/genome/FindBlocks';

let BlockChunkedChannel = React.createClass({
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
    side: React.PropTypes.element,
    controls: React.PropTypes.element,
    onClose: React.PropTypes.func
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
    let {start, end, width, height, sideWidth, side, controls} = this.props;

    if (width <= 0)
      return null;

    let effWidth = width - sideWidth;
    let scale = d3.scale.linear().domain([start, end]).range([0, effWidth]);
    let stepWidth = (scale(end) - scale(start)) / (end - start);
    let offset = scale(0) - scale(start + 0.5);

    let [[block1Start, block1End], [block2Start, block2End]] = findBlocks(start, end);
    //If we already are at an acceptable block then don't change it!
    if (!((this.blockEnd === block1End && this.blockStart === block1Start) ||
      (this.blockEnd === block2End && this.blockStart === block2Start))) {
      //Current block was acceptable so choose best one
      this.blockStart = block1Start;
      this.blockEnd = block1End;
    }

    let blockPixelWidth = (((width - sideWidth) / 2) / (end - start)) * (this.blockEnd - this.blockStart);
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={height}
        sideComponent={<div className="side-name">{side}</div>}
        //Override component update to get latest in case of skipped render
        configComponent={controls}
        onClose={this.handleClose}
      >
        {React.Children.map(this.props.children, (child) => React.cloneElement(child, {
          blockStart: this.blockStart,
          blockEnd: this.blockEnd,
          blockPixelWidth: blockPixelWidth
        }))}
      </ChannelWithConfigDrawer>);
  }
});


module.exports = BlockChunkedChannel;


