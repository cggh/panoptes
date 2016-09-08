import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import tickWidth from 'panoptes/TickWidth';

import d3 from 'd3';

const HEIGHT = 40;

let GenomeScale = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number
  },

  componentDidMount() {
    this.paint();
  },

  componentDidUpdate() {
    this.paint();
  },

  render() {
    const {width, sideWidth} = this.props;
    return (
      <div className="channel-container">
        <div className="channel-side" style={{width: `${sideWidth}px`, height: HEIGHT}}>
        </div>
        <div className="channel-stack">
          <div className="channel-data scale" >
            <canvas className="scale" ref="canvas" width={width - sideWidth} height={HEIGHT}/>
          </div>
        </div>
      </div>
    );
  },

  paint() {
    let {start, end, width, sideWidth} = this.props;
    const canvas = this.refs.canvas;

    let scale = d3.scale.linear().domain([start, end]).range([0, width - sideWidth]);

    //Make a small tick be close to this many pixels:
    let SMALL_TICK = 50;
    let smallTickWidth = Math.max(tickWidth(end - start, width, SMALL_TICK), 1);
    start = Math.max(0, start);
    start = Math.floor(start / smallTickWidth) * smallTickWidth;
    end = Math.max(start, end);
    let format = scale.tickFormat((end - start) / (smallTickWidth * 5), end - start > 5000 ? 's' : null);

    const ctx = canvas.getContext('2d', {alpha: false});
    ctx.lineWidth = 0.25;
    ctx.strokeStyle = 'darkgrey';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '14px Roboto,sans-serif';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    for (let pos = start; pos < end; pos += smallTickWidth) {
      if (!(pos / smallTickWidth % 5 === 0)) {
        const x = scale(pos);
        ctx.moveTo(x, 34);
        ctx.lineTo(x, 40);
      }
    }
    ctx.stroke();
    ctx.beginPath();
    for (let pos = start; pos < end; pos += smallTickWidth) {
      if (pos / smallTickWidth % 5 === 0) {
        const x = scale(pos);
        ctx.moveTo(x, 26);
        ctx.lineTo(x, 40);
        ctx.fillText(format(pos), pos == 0 && start == 0 ? x + 10 : x, 10);
      }
    }
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
});

module.exports = GenomeScale;


