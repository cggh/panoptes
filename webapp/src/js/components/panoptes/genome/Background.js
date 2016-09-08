import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import tickWidth from 'panoptes/TickWidth.js';

import d3 from 'd3';


let Background = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    sideWidth: React.PropTypes.number
  },

  componentDidMount() {
    this.paint();
  },

  componentDidUpdate() {
    this.paint();
  },

  render() {
    const {width, height} = this.props;
    return (
      <canvas className="background" ref="canvas" width={width} height={height}/>
    );
  },

  paint() {
    let {start, end, width, height, sideWidth} = this.props;
    const canvas = this.refs.canvas;

    let scale = d3.scale.linear().domain([start, end]).range([sideWidth, width]);

    //Make a small tick be close to this many pixels:
    let SMALL_TICK = 50;
    let smallTickWidth = Math.max(tickWidth(end - start, width, SMALL_TICK), 1);
    start = Math.max(0, start);
    //Overdraw in the negative direction to go under side controls
    start = Math.ceil((start / smallTickWidth)) * smallTickWidth;
    start = Math.max(0, start);
    end = Math.max(start, end);

    const ctx = canvas.getContext('2d', {alpha: false});
    ctx.lineWidth = 0.25;
    ctx.strokeStyle = 'darkgrey';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    for (let pos = start; pos < end; pos += smallTickWidth) {
        let x = scale(pos);
        ctx.moveTo(x, 40);
        ctx.lineTo(x, height);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let pos = start; pos < end; pos += smallTickWidth) {
      if (pos / smallTickWidth % 5 === 0) {
        let x = scale(pos);
        ctx.moveTo(x, 40);
        ctx.lineTo(x, height);
      }
    }
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

});

module.exports = Background;
