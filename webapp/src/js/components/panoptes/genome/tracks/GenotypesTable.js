import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import repeatString from 'repeat-string';
import chunkedMap from 'util/chunkedMap';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

const FRACTIONAL_COLOURMAP = [];
for (let i = 0; i < 255; i++) {
  FRACTIONAL_COLOURMAP[i + 1] = `hsla(${Math.round(240 + ((i / 256) * 120))},100%,35%,`;
}
FRACTIONAL_COLOURMAP[0] = 'hsl(0,50%,0%)';

function colourToRGBA(colour, alpha) {
  // TODO: Currently only supports RGB to RGBA. Support conversion from HEX, RGBA, HSL, HSLA
  return colour.replace(/\)/, `, ${alpha !== undefined ? alpha : 1})`).replace(/rgb/, 'rgba');
}

let GenotypesTable = createReactClass({
  displayName: 'GenotypesTable',

  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  contextTypes: {
    muiTheme: PropTypes.object
  },

  propTypes: {
    table: PropTypes.string,
    genomicPositions: PropTypes.any,
    colPositions: PropTypes.any,
    blocks: PropTypes.array,
    colWidth: PropTypes.number,
    start: PropTypes.number,
    end: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    rowHeight: PropTypes.number,
    cellColour: PropTypes.string,
    cellAlpha: PropTypes.string,
    cellHeight: PropTypes.string,
    layoutBlocks: PropTypes.array,
    dataBlocks: PropTypes.array
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
      const numRows = colShape[1];
      const numCols = colShape[0];
      offscreenCanvas.width = numCols;
      offscreenCanvas.height = colShape[1] * rowHeight;
      let ctx = offscreenCanvas.getContext('2d');

      function draw(x) {
        for (let y = 0, iEnd = numRows; y < iEnd; y++) {
          const index = x * numRows + y;
          let alpha = alphaArray ?
            Math.max(0, Math.min(1, (alphaArray[index] - alphaOffset) / alphaScale)) : 1;
          let height = heightArray ?
            Math.max(0, Math.min(1, (heightArray[index] - heightOffset) / heightScale)) : 1;
          //Decide a colour for this genotype
          let {genotypeRefColour, genotypeAltColour, genotypeHetColour, genotypeNoCallColour} = this.config.twoDTablesById[table];
          if (cellColour === 'call') {
            switch (colArray[index]) {
            case 0:  //REF
              ctx.fillStyle = colourToRGBA(genotypeRefColour, alpha);
              break;
            case 1:  //ALT
              ctx.fillStyle = colourToRGBA(genotypeAltColour, alpha);
              break;
            case 2:  //HET
              ctx.fillStyle = colourToRGBA(genotypeHetColour, alpha);
              break;
            default: //NO CALL
              height = 0.2;
              alpha = 0.2;
              ctx.fillStyle = genotypeNoCallColour;
              break;
            }
          } else if (cellColour === 'fraction') {
            const fraction = colArray[index];
            ctx.fillStyle = fraction > 0 ? `${FRACTIONAL_COLOURMAP[fraction] + alpha})` : FRACTIONAL_COLOURMAP[0];
          }
          ctx.fillRect(x, (y * rowHeight) + ((1 - height) * rowHeight * 0.5), 1, height * rowHeight);
        }
      }

      function update() {
        this.paint(this.refs.gridCanvas, this.refs.overlayCanvas);
      }

      chunkedMap([0, numCols], draw, update, 100, 50, this);
      block.len = numCols || 0;
      block.cache = offscreenCanvas;
      block.cacheKey = cacheKey;
    }
  },

  paint(gridCanvas, overlayCanvas) {
    const {dataBlocks, layoutBlocks, width, start, end, colWidth} = this.props;
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

    if (!layoutBlocks || !dataBlocks) {
      return;
    }
    dataBlocks.forEach(this.drawOffscreenIfNeeded);
    //Loop over the layout blocks to draw them
    let dataBlockOffset = 0;
    let dataBlockIndex = 0;
    for (let i = 0; i < layoutBlocks.length; i++) {
      let [blockStart, blockEnd, colStart] = layoutBlocks[i];
      while (true) { //eslint-disable-line no-constant-condition
        const currentDataBlock = dataBlocks[dataBlockIndex];
        if (dataBlockOffset + currentDataBlock.len <= blockStart) {
          dataBlockIndex += 1;
          dataBlockOffset += currentDataBlock.len;
        } else if (dataBlockOffset > blockEnd) {
          throw Error('Datablocks not in order? Data is ahead of layout');
        } else {
          const sourceStart = blockStart - dataBlockOffset;
          const sourceEnd = Math.min(blockEnd - dataBlockOffset, currentDataBlock.len);
          const sourceWidth = sourceEnd - sourceStart;
          const source = currentDataBlock.cache;
          gCtx.drawImage(source, sourceStart, 0, sourceWidth, source.height, //Source params
            colStart * pixColWidth, 0, sourceWidth * pixColWidth, source.height); //Destination params
          this.drawColumnGaps(gCtx, sourceWidth, colStart, source.height);
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

  drawColumnGaps(ctx, sourceWidth, colStart, height) {
    const {width, start, end, colWidth} = this.props;
    const pixColWidth = colWidth * (width / (end - start));
    //Draw some gaps if the columns are wide
    let drawPixColWidth = pixColWidth;
    if (pixColWidth > 120) {
      drawPixColWidth = 120;
    } else if (pixColWidth > 40) {
      drawPixColWidth = pixColWidth - 2;
    }
    let gapWidth = pixColWidth - drawPixColWidth;
    ctx.fillStyle = 'white';
    if (gapWidth > 0) {
      for (let i = 0; i < sourceWidth + 1; ++i) {
        ctx.fillRect(((colStart + i) * pixColWidth) - (gapWidth / 2), 0, gapWidth, height);
      }
    }
  },

  drawOverlay(ctx, block, sourceStart, sourceWidth, colStart) {
    const {cellColour, table, rowHeight, width, height, start, end, colWidth, hoverPos} = this.props;
    const pixColWidth = colWidth * (width / (end - start));
    let config = this.config.twoDTablesById[table];

    //First check the block has data and grab ploidy from it
    let textArray = cellColour == 'call' ? block[`2D_${config.showInGenomeBrowser.call}`] :
      block[`2D_${config.showInGenomeBrowser.alleleDepth}`];
    if (!textArray) return;

    const arity = textArray.shape[2] || 1;
    const numRows = textArray.shape[1] || 0;
    const numCols = textArray.shape[0] || 0;
    textArray = textArray.array;
    ctx.save();
    ctx.font = `${rowHeight}px Roboto`;
    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    let style = 1; //Flag to stop unnecessary switching of style;
    const textWidth = ctx.measureText(repeatString(cellColour == 'fraction' ? '0000,' : '88/', arity)).width;
    if (pixColWidth > textWidth + 15 && rowHeight >= 6) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < sourceWidth; ++i) {
        ctx.fillRect(((colStart + i + 0.5) * pixColWidth) - textWidth / 2, 0, textWidth, numRows * rowHeight);
      }
      ctx.fillStyle = 'rgb(40,40,40)';
      for (let i = 0; i < sourceWidth; ++i) {
        for (let j = 0; j < numRows; ++j) {
          const sourceIndex = ((i + sourceStart) * numRows) + j;
          let text = '';
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
    if (hoverPos) {
      let drawPixColWidth = pixColWidth;
      if (pixColWidth > 120) {
        drawPixColWidth = 120;
      } else if (pixColWidth > 40) {
        drawPixColWidth = pixColWidth - 2;
      }
      for (let i = 0; i < sourceWidth; ++i) {
        let pos = block[`col_${this.config.tablesById[config.columnDataTable].position}`].array[i + sourceStart];
        if (pos == hoverPos) {
          const x = ((colStart + i) * pixColWidth) + ((pixColWidth - drawPixColWidth) / 2);
          const x2 = x + drawPixColWidth;
          ctx.fillStyle = 'black';
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          if ((x2 - x) > 1) {
            ctx.moveTo(x2, 0);
            ctx.lineTo(x2, height);
          }
          ctx.stroke();
        }
      }
    }
  },

  render() {
    const {dataBlocks, layoutBlocks, width, height} = this.props;

    if (!layoutBlocks || !dataBlocks) {
      return <div>
        <canvas ref="gridCanvas"
          width={width}
          height={height}/>
        <canvas ref="overlayCanvas"
          width={width}
          height={height}/>
      </div>;
    }

    return <div className="genotypes-table">
      <canvas ref="gridCanvas"
        width={width}
        height={height}/>
      <canvas ref="overlayCanvas"
        width={width}
        height={height}/>
    </div>;
  },
});

export default GenotypesTable;
