import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import tickWidth from 'panoptes/TickWidth.js';

import {scaleLinear} from 'd3-scale';


let Background = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    sideWidth: React.PropTypes.number,
    hoverPos: React.PropTypes.number,
    onChangeHoverPos: React.PropTypes.func
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
      <canvas className="background"
              ref="canvas"
              width={width}
              height={height}
      />
    );
  },

  paint() {
    let {start, end, width, height, sideWidth, hoverPos} = this.props;
    const canvas = this.refs.canvas;

    let scale = scaleLinear().domain([start, end]).range([sideWidth, width]);

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
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    if (hoverPos != null)
    {
      let x = scale(hoverPos);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

});

export default Background;
