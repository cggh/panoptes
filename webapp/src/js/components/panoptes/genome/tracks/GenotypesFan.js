import React from "react";
import PureRenderMixin from 'mixins/PureRenderMixin';
import manualTween from 'util/manualTween';
import d3 from 'd3';

let GenotypesFan = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    genomicPositions: React.PropTypes.any,
    colPositions: React.PropTypes.any,
    colWidth: React.PropTypes.number,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
  },

  componentDidMount() {
    this.paint(this.refs.canvas, this.props);
  },

  componentDidUpdate() {
    this.paint(this.refs.canvas, this.props);
  },

  paint(canvas, props) {
    const {genomicPositions, colPositions, start, end, width, height, colWidth} = props;
    const ctx = canvas.getContext('2d');
    const scale = d3.scale.linear().domain([start, end]).range([0, width]);

    ctx.clearRect(0, 0, canvas.width, canvas.height);


    if (!genomicPositions || !colPositions) {
      return;
    }
    ctx.lineWidth = 1;//snp && snp.selected ? 2 : 1;
    ctx.strokeStyle = 'rgba(80,80,80, 0.75)';
    const mid = height * 0.5;
    const alpha = manualTween(colWidth, 5, 20);

    let last_end = NaN;
    for (let i = 0, end = colPositions.length; i < end; ++i) {
      // var key = col_primary_key[i];
      let spos = Math.floor(scale(colPositions[i]) - (colWidth * 0.5));
      const spos_end = Math.ceil(spos + (colWidth));
      if (spos < last_end)
        spos = last_end;
      last_end = spos_end;
      const width = spos_end - spos;
      const p = Math.round(spos+(width/2));
      const o = scale(genomicPositions[i]);
      // ctx.strokeStyle = 'rgba(80,80,80, 0.75)';
      // if (fncIsColSelected(key)) {
      //   ctx.strokeStyle = 'rgba(150, 0, 0, 0.75)';
      // }
      ctx.beginPath();
      ctx.moveTo(o,0);
      ctx.bezierCurveTo(o, mid, p , mid, p, height);
      ctx.stroke();
    }

  },


  render() {
    let {width, height} = this.props;
    return <canvas ref="canvas"
                   width={width}
                   height={height}/>;
  }
});

export default GenotypesFan;
