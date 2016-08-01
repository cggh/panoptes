import React from "react";
import PureRenderMixin from 'mixins/PureRenderMixin';
import manualTween from 'util/manualTween';

const HAT_HEIGHT = 20;

let GenotypesFan = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    genomicPositions: React.PropTypes.any,
    colPositions: React.PropTypes.any,
    blocks: React.PropTypes.array,
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
    const scale =  width / (end - start);
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    if (!genomicPositions || !colPositions) {
      return;
    }
    ctx.lineWidth = 1;//snp && snp.selected ? 2 : 1;
    ctx.strokeStyle = 'rgba(80,80,80, 0.75)';

    const pixColWidth = colWidth * scale;
    const alpha = manualTween(pixColWidth, 5, 20);
    //Correspondence line
    const lineHeight = height - HAT_HEIGHT;
    const mid = lineHeight * 0.5;
    for (let i = 0, end = colPositions.length; i < end; ++i) {
      // var key = col_primary_key[i];
      const p = (colPositions[i] - start) * scale;
      const o = (genomicPositions[i] - start) * scale;
      // ctx.strokeStyle = 'rgba(80,80,80, 0.75)';
      // if (fncIsColSelected(key)) {
      //   ctx.strokeStyle = 'rgba(150, 0, 0, 0.75)';
      // }
      ctx.beginPath();
      ctx.moveTo(o,0);
      ctx.bezierCurveTo(o, mid, p , mid, p, lineHeight);
      if (alpha === 0) {
        ctx.lineTo(p, height);
      }
      ctx.stroke();
    }
    if (alpha > 0) {
      //Little hat and area fill
      ctx.font = "12px sans-serif";
      ctx.fillStyle = 'rgb(0,0,0)';
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      for (let i = 0, end = colPositions.length; i < end; ++i) {
        // var key = col_primary_key[i];
        var colour = 'rgba(190,190,190, 0.75)';
        ctx.strokeStyle = 'rgba(120,120,120, 0.75)';
        // if (fncIsColSelected(key)) {
        //   var colour = 'rgba(190,80,80, 0.75)';
        //   ctx.strokeStyle = 'rgba(150, 0, 0, 0.75)';
        // }
        ctx.fillStyle = colour;
        const spos = (colPositions[i] - start) * scale;
        var middle = pixColWidth / 2;

        ctx.save();
        ctx.translate(spos - middle, height);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(0, -10, middle, -10, middle, -HAT_HEIGHT);
        ctx.bezierCurveTo(middle, -10, pixColWidth, -10, pixColWidth, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

      }
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
