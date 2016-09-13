import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import manualTween from 'util/manualTween';
import _transform from 'lodash/transform';
import _filter from 'lodash/filter';
import {hatchRect} from 'util/CanvasDrawing';

const HAT_HEIGHT = 20;

let GenotypesFan = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    genomicPositions: React.PropTypes.any,
    colWidth: React.PropTypes.number,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
  },

  componentDidMount() {
    this.paint(this.refs.canvas, this.props);
  },

  componentWillReceiveProps(nextProps) {
    if (this.props.dataBlocks !== nextProps.dataBlocks) {
      //Filter out big blocks and merge neighbouring ones.
      this.tooBigBlocks = _transform(_filter(nextProps.dataBlocks, {_tooBig: true}), (merged, block) => {
        const lastBlock = merged[merged.length - 1];
        if (lastBlock && lastBlock._blockStart + lastBlock._blockSize === block._blockStart) {
          //Copy to avoid mutating the cache
          merged[merged.length - 1] = {...lastBlock, _blockSize: lastBlock._blockSize + block._blockSize};
        } else {
          merged.push(block);
        }
      });
    } else {
      this.tooBigBlocks = [];
    }

  },

  componentDidUpdate() {
    this.paint(this.refs.canvas, this.props);
  },

  paint(canvas, props) {
    const {genomicPositions, dataBlocks, layoutBlocks, start, end, width, height, colWidth} = props;
    const ctx = canvas.getContext('2d');
    const scale =  width / (end - start);
    ctx.clearRect(0, 0, canvas.width, canvas.height);


    if (!layoutBlocks || !genomicPositions) {
      return;
    }
    ctx.lineWidth = 1;//snp && snp.selected ? 2 : 1;
    ctx.strokeStyle = 'rgba(80,80,80, 0.6)';

    const pixColWidth = colWidth * scale;
    const alpha = manualTween(pixColWidth, 5, 20);
    //Correspondence line
    const lineHeight = height - HAT_HEIGHT;
    const mid = lineHeight * 0.5;
    let lastDrawn = null;
    for (let i = 0, iend = layoutBlocks.length; i < iend; ++i) {
      const [blockStart, blockEnd, colStart] = layoutBlocks[i];
      for (let j = blockStart, jCol = colStart + 0.5; j < blockEnd; ++j, ++jCol) {
        // var key = col_primary_key[i];
        const columnPixel = jCol * pixColWidth;
        const genomicPixel = (genomicPositions[j] - start) * scale;
        // ctx.strokeStyle = 'rgba(80,80,80, 0.75)';
        // if (fncIsColSelected(key)) {
        //   ctx.strokeStyle = 'rgba(150, 0, 0, 0.75)';
        // }
        if (pixColWidth > 2 ||    //Skip some if things are dense
            !lastDrawn ||
            genomicPixel - lastDrawn[0] > 2 ||
            columnPixel - lastDrawn[1] > 2) {
          ctx.beginPath();
          ctx.moveTo(genomicPixel, 0);
          ctx.bezierCurveTo(genomicPixel, mid, columnPixel, mid, columnPixel, lineHeight);
          if (alpha === 0) {
            ctx.lineTo(columnPixel, height);
          }
          ctx.stroke();
          lastDrawn = [genomicPixel, columnPixel];
        }
      }
    }
    if (alpha > 0) {
      //Little hat and area fill
      ctx.font = '12px Roboto';
      ctx.fillStyle = 'rgb(0,0,0)';
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0, iend = layoutBlocks.length; i < iend; ++i) {
        const [blockStart, blockEnd, colStart] = layoutBlocks[i];
        for (let j = blockStart, jCol = colStart + 0.5; j < blockEnd; ++j, ++jCol) {
          // var key = col_primary_key[i];
          let colour = 'rgba(190,190,190, 0.75)';
          ctx.strokeStyle = 'rgba(120,120,120, 0.75)';
          // if (fncIsColSelected(key)) {
          //   var colour = 'rgba(190,80,80, 0.75)';
          //   ctx.strokeStyle = 'rgba(150, 0, 0, 0.75)';
          // }
          ctx.fillStyle = colour;
          const spos = jCol * pixColWidth;
          let middle = pixColWidth / 2;

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
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px Roboto';
    let psy = (height / 2) - 12;
    this.tooBigBlocks.forEach((block) => {
      const pixelStart = scale * (block._blockStart - start);
      const pixelSize = scale * ( block._blockSize);
      const textPos = (pixelStart < 0 && pixelStart + pixelSize > width) ? width / 2 : pixelStart + (pixelSize / 2);
      hatchRect(ctx, pixelStart, psy, pixelSize, 24, 8);
      if (pixelSize > 100) {
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'miter'; //Prevent letters with tight angles making spikes
        ctx.miterLimit = 2;
        ctx.strokeText('Zoom in', textPos, psy + 12);
        ctx.fillText('Zoom in', textPos, psy + 12);
        ctx.restore();
      }
    });
  },


  render() {
    let {width, height} = this.props;
    return <canvas ref="canvas"
                   width={width}
                   height={height}/>;
  }
});

export default GenotypesFan;
