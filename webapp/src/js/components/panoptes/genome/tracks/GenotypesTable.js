import React from "react";
import PureRenderMixin from 'mixins/PureRenderMixin';
import _sumBy from 'lodash/sumBy';
import _filter from 'lodash/filter';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

const FRACTIONAL_COLOURMAP = [];
for (var i = 0; i < 255; i++) {
  FRACTIONAL_COLOURMAP[i + 1] = 'hsla(' + Math.round(240 + ((i / 256) * 120)) + ',100%,35%,';
}
FRACTIONAL_COLOURMAP[0] = 'hsl(0,50%,0%)';

let GenotypesTable = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
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
    this.paint(this.refs.canvas);
  },

  componentDidUpdate() {
    this.paint(this.refs.canvas);
  },

  drawOffscreenIfNeeded(block) {
    const {cellColour, cellAlpha, cellHeight, rowHeight, table} = this.props;
    let config = this.config.twoDTablesById[table];

    if (block._tooBig) {
      block.len = 0;
      return;
    }

    const colArray = block[`2D__${cellColour}`].array;
    const colShape = block[`2D__${cellColour}`].shape;
    let alphaArray, alphaShape, alphaOffset, alphaScale;
    if (cellAlpha) {
      if (!block[`2D__${cellAlpha}`]) throw Error(`${cellAlpha} is not a property of 2D table ${table}`);
      alphaArray = block[`2D_${cellAlpha}`].array;
      alphaShape = block[`2D_${cellAlpha}`].shape;
      alphaOffset = config.propertiesById[cellAlpha].minVal;
      alphaScale = config.propertiesById[cellAlpha].maxVal - alphaOffset;
    }
    let heightArray, heightShape, heightOffset, heightScale;
    if (cellHeight) {
      if (!block[`2D__${cellHeight}`]) throw Error(`${cellHeight} is not a property of 2D table ${table}`);
      heightArray = block[`2D_${cellHeight}`].array;
      heightShape = block[`2D_${cellHeight}`].shape;
      heightOffset = config.propertiesById[cellHeight].minVal;
      heightScale = config.propertiesById[cellHeight].maxVal - heightOffset;
    }
    if (colShape.length !== 2) throw Error(`Wrong array dimension for ${cellColour} must be 2D`);
    if (alphaShape && alphaShape.length !== 2) throw Error(`Wrong array dimension for ${cellAlpha} must be 2D`);
    if (heightShape && heightShape.length !== 2) throw Error(`Wrong array dimension for ${cellColour} must be 2D`);

    const cacheKey = JSON.stringify({
      cellColour,
      cellAlpha,
      cellHeight,
      rowHeight,
      alphaOffset,
      alphaScale,
      heightOffset,
      heightScale
    });
    if (block.cacheKey !== cacheKey) {

      let offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = colShape[1];
      offscreenCanvas.height = colShape[0] * rowHeight;
      let ctx = offscreenCanvas.getContext('2d');
      const colLen = colShape[1];
      for (let x = 0, jEnd = colShape[1]; x < jEnd; x++) {
        for (let y = 0, iEnd = colShape[0]; y < iEnd; y++) {
          const index = y * colLen + x;
          let alpha = alphaArray ?
            Math.max(0, Math.min(1, (alphaArray[index] - alphaOffset) / alphaScale)) : 1;
          let height = heightArray ?
            Math.max(0, Math.min(1, (heightArray[index] - heightOffset) / heightScale)) : 1;
          //Decide a colour for this genotype
          if (cellColour === 'call') {
            switch (colArray[index]) {
              case 0:  //REF
                ctx.fillStyle = 'rgba(0,55,135,' + alpha + ')';
                break;
              case 1:  //ALT
                ctx.fillStyle = 'rgba(180,0,0,' + alpha + ')';
                break;
              case 2:  //HET
                ctx.fillStyle = 'rgba(78,154,0,' + alpha + ')';
                break;
              default: //NO CALL
                height = 0.2;
                alpha = 0.2;
                ctx.fillStyle = 'rgb(230,230,230)';
                break;
            }
          } else if (cellColour === 'fraction') {
            const fraction = colArray[index];
            ctx.fillStyle = fraction > 0 ? FRACTIONAL_COLOURMAP[fraction] + alpha + ')' : FRACTIONAL_COLOURMAP[0];
          }
          ctx.fillRect(x, (y * rowHeight) + ((1 - height) * rowHeight * 0.5), 1, height * rowHeight);
        }
      }
      block.len = colLen || 0;
      block.cache = offscreenCanvas;
      block.cacheKey = cacheKey;
    }

  },

  paint(canvas) {
    const {rowData, dataBlocks, layoutBlocks, width, height, start, end, colWidth} = this.props;
    const pixColWidth = colWidth * (width / (end - start));

    const ctx = canvas.getContext('2d');
    const pix = pixColWidth < 2;
    ctx.mozImageSmoothingEnabled = pix;
    ctx.webkitImageSmoothingEnabled = pix;
    ctx.msImageSmoothingEnabled = pix;
    ctx.oImageSmoothingEnabled = pix;
    ctx.imageSmoothingEnabled = pix;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!layoutBlocks || !dataBlocks || !rowData) {
      return;
    }
    dataBlocks.forEach(this.drawOffscreenIfNeeded);
    //Loop over the layout blocks to draw them
    let dataBlockOffset = 0;
    let dataBlockIndex = 0;
    for (let i = 0; i < layoutBlocks.length; i++) {
      let [blockStart, blockEnd, colStart] = layoutBlocks[i];
      while (true) {
        const currentDataBlock = dataBlocks[dataBlockIndex];
        if (dataBlockOffset + currentDataBlock.len <= blockStart ) {
          dataBlockIndex += 1;
          dataBlockOffset += currentDataBlock.len;
        } else if (dataBlockOffset > blockEnd){
          throw Error("Datablocks not in order? Data is ahead of layout");
        } else {
          const source = currentDataBlock.cache;
          const sourceStart = blockStart - dataBlockOffset;
          const sourceEnd = Math.min(blockEnd - dataBlockOffset, currentDataBlock.len);
          const sourceWidth = sourceEnd - sourceStart
          ctx.drawImage(source, sourceStart, 0, sourceEnd-sourceStart, source.height, //Source params
            colStart * pixColWidth, 0, (sourceEnd-sourceStart) * pixColWidth, source.height); //Destination params
          if (blockEnd - dataBlockOffset > currentDataBlock.len) {  //Not all was drawn, need to go to next data
            blockStart += sourceWidth;
            colStart += sourceWidth;
          } else { //All was drawn, skip to next layout block
            break;
          }
        }
      }
    }
  },


  render() {
    const {rowData, dataBlocks, layoutBlocks, rowHeight, width, height, colWidth} = this.props;

    if (!layoutBlocks || !dataBlocks || !rowData) {
      return <canvas ref="canvas"
                     width={width}
                     height={height}/>;
    }

    const numPositions = _sumBy(layoutBlocks,
      ([blockStart, blockEnd, colStart]) => blockEnd - blockStart);
    const numRows = rowData.id.array.length;
    return <canvas ref="canvas"
                   width={width}
                   height={height}/>;
  }
});

export default GenotypesTable;
