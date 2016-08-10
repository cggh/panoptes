import React from "react";
import repeatString from 'repeat-string';
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
    this.paint(this.refs.gridCanvas, this.refs.overlayCanvas);
  },

  componentDidUpdate() {
    this.paint(this.refs.gridCanvas, this.refs.overlayCanvas);
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
      alphaArray = block[`2D_${cellAlpha}`].array;
      alphaShape = block[`2D_${cellAlpha}`].shape;
      alphaOffset = config.propertiesById[cellAlpha].minVal;
      alphaScale = config.propertiesById[cellAlpha].maxVal - alphaOffset;
    }
    let heightArray, heightShape, heightOffset, heightScale;
    if (cellHeight) {
      heightArray = block[`2D_${cellHeight}`].array;
      heightShape = block[`2D_${cellHeight}`].shape;
      heightOffset = config.propertiesById[cellHeight].minVal;
      heightScale = config.propertiesById[cellHeight].maxVal - heightOffset;
    }
    if (colShape.length !== 2) throw Error(`Wrong array dimension for ${cellColour} must be 2D`);
    if (alphaShape && alphaShape.length !== 2 && alphaShape[0] !== 0) throw Error(`Wrong array dimension for ${cellAlpha} must be 2D`);
    if (heightShape && heightShape.length !== 2 && heightShape[0] !== 0) throw Error(`Wrong array dimension for ${cellHeight} must be 2D`);

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
      const rowLen = colShape[1];
      offscreenCanvas.width = rowLen;
      offscreenCanvas.height = colShape[0] * rowHeight;
      let ctx = offscreenCanvas.getContext('2d');
      for (let x = 0, jEnd = rowLen; x < jEnd; x++) {
        for (let y = 0, iEnd = colShape[0]; y < iEnd; y++) {
          const index = y * rowLen + x;
          let alpha = alphaArray ?
            Math.max(0, Math.min(1, (alphaArray[index] - alphaOffset) / alphaScale)) : 1;
          let height = heightArray ?
            Math.max(0, Math.min(1, (heightArray[index] - heightOffset) / heightScale)) : 1;
          //Decide a colour for this genotype
          if (cellColour === 'call') {
            switch (colArray[index]) {
              case 0:  //REF
                ctx.fillStyle = 'rgba(0,128,192,' + alpha + ')';
                break;
              case 1:  //ALT
                ctx.fillStyle = 'rgba(255,50,50,' + alpha + ')';
                break;
              case 2:  //HET
                ctx.fillStyle = 'rgba(0,192,120,' + alpha + ')';
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
      block.len = rowLen || 0;
      block.cache = offscreenCanvas;
      block.cacheKey = cacheKey;
    }

  },

  paint(gridCanvas, overlayCanvas) {
    const {rowData, dataBlocks, layoutBlocks, width, height, start, end, colWidth} = this.props;
    const pixColWidth = colWidth * (width / (end - start));

    const gCtx = gridCanvas.getContext('2d');
    const oCtx = overlayCanvas.getContext('2d');
    const pix = pixColWidth < 2;
    gCtx.mozImageSmoothingEnabled = pix;
    gCtx.webkitImageSmoothingEnabled = pix;
    gCtx.msImageSmoothingEnabled = pix;
    gCtx.oImageSmoothingEnabled = pix;
    gCtx.imageSmoothingEnabled = pix;
    gCtx.fillStyle = 'white';
    gCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
    oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

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
          const sourceWidth = sourceEnd - sourceStart;
          gCtx.drawImage(source, sourceStart, 0, sourceWidth, source.height, //Source params
            colStart * pixColWidth, 0, sourceWidth * pixColWidth, source.height); //Destination params
          this.drawOverlay(oCtx, currentDataBlock, sourceStart, sourceWidth, colStart);
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

  drawOverlay(ctx, block, sourceStart, sourceWidth, colStart) {
    const {cellColour, table, rowHeight, width, start, end, colWidth} = this.props;
    const pixColWidth = colWidth * (width / (end - start));
    let config = this.config.twoDTablesById[table];

    //First check the block has data and grab ploidy from it
    let textArray = cellColour == 'call' ? block[`2D_${config.showInGenomeBrowser.call}`] :
      block[`2D_${config.showInGenomeBrowser.alleleDepth}`];
    if (!textArray) return;

    const arity = textArray.shape[2] || 1;
    const colLen = textArray.shape[0] || 0;
    const rowLen = textArray.shape[1] || 0;
    textArray = textArray.array;
    ctx.save();
    ctx.font = "" + rowHeight + "px sans-serif";
    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    let style = 1; //Flag to stop unnecessary switching of style;
    const textWidth = ctx.measureText(repeatString(cellColour == 'fraction' ? '0000,' : '88/', arity)).width;
    if (pixColWidth > textWidth + 15 && rowHeight >= 6) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < sourceWidth; ++i) {
        ctx.fillRect(((colStart + i + 0.5) * pixColWidth) - textWidth/2, 0, textWidth, colLen * rowHeight)
      }
      ctx.fillStyle = 'rgb(40,40,40)';
      for (let i = 0; i < sourceWidth; ++i) {
        for (let j = 0; j < colLen; ++j) {
          const sourceIndex = (j * rowLen) + i + sourceStart;
          var text = '';
          for (let k = sourceIndex * arity, kEnd = (sourceIndex * arity) + arity; k < kEnd; ++k) {
            text += textArray[k];
            if (k < kEnd - 1)
              text += cellColour == 'call' ? ',' : '/';
          }
          const x = (colStart + i + 0.5) * pixColWidth;
          const y = (j + 0.5) * rowHeight;
          if (cellColour == 'call') {
            const callSummary = block['2D__call'].array[sourceIndex];
            if (callSummary == -1 || callSummary == -2) {  //NULL
              if (style != 0) {
                ctx.fillStyle = 'rgb(150,150,150)';
                style = 0;
              }
              ctx.fillText('●', x, y);
              continue;
            }
            if (callSummary == 0) {                         //REF
              if (style != 0) {
                ctx.fillStyle = 'rgb(150,150,150)';
                style = 0;
              }
              ctx.fillText(text, x, y);                     //ALT/HET
            } else {
              if (style != 1) {
                ctx.fillStyle = 'rgb(40,40,40)';
                style = 1;
              }
              ctx.fillText(text, x, y);
            }
          } else {
            ctx.fillText(text, x, y);
          }
        }
      }
    }
  },

  render() {
    const {rowData, dataBlocks, layoutBlocks, rowHeight, width, height, colWidth} = this.props;

    if (!layoutBlocks || !dataBlocks || !rowData) {
      return <div>
        <canvas ref="gridCanvas"
                     width={width}
                     height={height}/>
        <canvas ref="overlayCanvas"
                width={width}
                height={height}/>
        </div>;
    }

    const numPositions = _sumBy(layoutBlocks,
      ([blockStart, blockEnd, colStart]) => blockEnd - blockStart);
    const numRows = rowData.id.array.length;
    return <div className="genotypes-table">
      <canvas ref="gridCanvas"
              width={width}
              height={height}/>
      <canvas ref="overlayCanvas"
              width={width}
              height={height}/>
    </div>;
  }
});

export default GenotypesTable;
