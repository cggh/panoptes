import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import Tooltip from 'rc-tooltip';
import {CopyToClipboard} from 'react-copy-to-clipboard';

import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import FluxMixin from 'mixins/FluxMixin';

import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';
import ErrorReport from 'panoptes/ErrorReporter';
import LegendElement from 'panoptes/LegendElement';
import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import {findBlock, regionCacheGet} from 'util/PropertyRegionCache';
import Button from 'ui/Button';

const HEIGHT = 27;
const SEQ_LOOKUP = {
  97: 'A',
  116: 'T',
  99: 'C',
  103: 'G'
};

let ReferenceSequence = createReactClass({
  displayName: 'ReferenceSequence',

  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        //'setProps',
        //'onClose'
      ],
      check: [
        'chromosome',
        'width',
        'sideWidth',
        'name'
      ]
    }),
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'width', 'sideWidth')
  ],

  propTypes: {
    chromosome: PropTypes.string,
    start: PropTypes.number,
    end: PropTypes.number,
    width: PropTypes.number,
    sideWidth: PropTypes.number,
    onChangeLoadStatus: PropTypes.func
  },

  componentWillMount() {
    this.blocks = [];
  },

  componentDidUpdate() {
    this.draw(this.props, this.blocks);
  },

  //Called by DataFetcherMixin on prop change
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth} = props;
    if (this.props.chromosome !== chromosome) {
      this.applyData(props, []);
    }
    if (width - sideWidth < 1) {
      return;
    }

    const {blockLevel, blockIndex, needNext, summaryWindow} = findBlock({start, end, width});
    //If we already at this block then don't change it!
    if (this.props.chromosome !== chromosome || !(this.blockLevel === blockLevel
        && this.blockIndex === blockIndex
        && this.needNext === needNext
        && this.requestSummaryWindow === summaryWindow
    )) {
      //Current block was unacceptable so choose best one
      this.blockLevel = blockLevel;
      this.blockIndex = blockIndex;
      this.needNext = needNext;
      this.requestSummaryWindow = summaryWindow;
      if (this.props.onChangeLoadStatus) {
        this.props.onChangeLoadStatus('LOADING');
      }
      const columns = [
        {expr: ['/', ['pos', summaryWindow]], as: 'window'},
        {expr: ['count', ['*']], as: 'count'},
        'base'
      ];
      const query = SQL.WhereClause.CompareFixed('chrom', '=', chromosome);
      let APIargs = {
        database: this.config.dataset,
        table: '_sequence_',
        columns,
        query: SQL.WhereClause.encode(query),
        groupBy: ['base', 'window'],
        orderBy: [['asc', 'window'], ['desc', 'count']],
        transpose: false,
        typedArrays: true
      };
      let cacheArgs = {
        method: 'query',
        regionField: 'pos',
        queryField: 'query',
        start,
        end,
        useWiderBlocksIfInCache: false,
        isBlockTooBig: () => false,
        postProcessBlock: this.cacheDraw
      };

      requestContext.request((componentCancellation) =>
        regionCacheGet(APIargs, cacheArgs, componentCancellation)
          .then((blocks) => {
            if (this.props.onChangeLoadStatus) {
              this.props.onChangeLoadStatus('DONE');
            }
            this.applyData(this.props, blocks, summaryWindow);
          })
          .catch((err) => {
            if (this.props.onChangeLoadStatus) {
              this.props.onChangeLoadStatus('DONE');
            }
            throw err;
          })
          .catch(API.filterAborted)
          .catch(LRUCache.filterCancelled)
          .catch((error) => {
            this.applyData(this.props, []);
            ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
            throw error;
          })
      );
    }
    this.draw(props);
  },

  cacheDraw(block) {
    let base = block.base.array;
    let window = block.window.array;
    const sequence = [];
    //The returned array includes all bases in the window - trim to the modal which is the first due to sorting
    let lastWindow = null;
    for (let i = 0, iEnd = base.length; i < iEnd; ++i) {
      if (window[i] !== lastWindow) {
        sequence.push(base[i]);
        lastWindow = window[i];
      }
    }
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = sequence.length;
    offscreenCanvas.height = 1;
    if (sequence.length < 1)
      return;
    let ctx = offscreenCanvas.getContext('2d', {alpha: false});
    let imageData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    let data = imageData.data;
    //It is safe to assume the sequence data has no gaps as we inserted it on import
    for (let i = 0, iEnd = sequence.length; i < iEnd; ++i) {
      data[i * 4 + 3] = 255;
      switch (sequence[i]) {
      case 97: //a
        data[i * 4] = 255;
        data[i * 4 + 1] = 50;
        data[i * 4 + 2] = 50;
        break;
      case 116: //t
        data[i * 4] = 255;
        data[i * 4 + 1] = 170;
        data[i * 4 + 2] = 0;
        break;
      case 99: //c
        data[i * 4] = 0;
        data[i * 4 + 1] = 128;
        data[i * 4 + 2] = 192;
        break;
      case 103: //g
        data[i * 4] = 0;
        data[i * 4 + 1] = 192;
        data[i * 4 + 2] = 120;
        break;
      default:
        data[i * 4] = 0;
        data[i * 4 + 1] = 0;
        data[i * 4 + 2] = 0;
        break;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    block.cache = offscreenCanvas;
    return block;
  },

  applyData(props, blocks, summaryWindow) {
    this.blocks = blocks;
    this.summaryWindow = summaryWindow;
    this.draw(props);
  },

  draw(props) {
    const {start, end, width, sideWidth} = props;
    if (!this.canvas) {
      return;
    }
    const xScaleFactor = (width - sideWidth) / (end - start);
    const pixelWindowSize = this.summaryWindow * xScaleFactor;
    const canvas = this.canvas;
    const ctx = canvas.getContext('2d', {alpha: false});
    //Squares
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!this.summaryWindow || !this.blocks || this.blocks.length < 1) {
      return;
    }
    const pix = pixelWindowSize < 1;
    ctx.mozImageSmoothingEnabled = pix;
    ctx.webkitImageSmoothingEnabled = pix;
    ctx.msImageSmoothingEnabled = pix;
    ctx.oImageSmoothingEnabled = pix;
    ctx.imageSmoothingEnabled = pix;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px Roboto,sans-serif';
    const maxDraw = canvas.width + 15;
    this.blocks.forEach((block) => {
      if (block.cache) {
        const source = block.cache;
        ctx.drawImage(source, 0, 0, source.width, source.height, //Source params
          xScaleFactor * (block._blockStart + 0.5 - start), 0, source.width * pixelWindowSize, HEIGHT); //Destination params
        if (pixelWindowSize >= 15 && this.summaryWindow === 1) {
          const base = block.base.array;
          for (let i = 0, iEnd = base.length; i < iEnd; ++i) {
            const x = xScaleFactor * (block._blockStart - start) + ((i + 1) * pixelWindowSize);
            if (x > 0 && x < maxDraw) {
              ctx.fillText(SEQ_LOOKUP[base[i]] || '', x, HEIGHT / 2);
            }
          }
        }
      }
    });
  },

  getSeq() {
    if (this.summaryWindow === 1) {
      let seq = '';
      const {start, end, width, sideWidth} = this.props;
      const xScaleFactor = (width - sideWidth) / (end - start);
      const pixelWindowSize = this.summaryWindow * xScaleFactor;
      this.blocks.forEach((block) => {
        const base = block.base.array;
        for (let i = 0, iEnd = base.length; i < iEnd; ++i) {
          const x = xScaleFactor * (block._blockStart - start) + ((i + 1) * pixelWindowSize);
          if (x > 0 && x < width - sideWidth) {
            seq = seq + SEQ_LOOKUP[base[i]] || 'N';
          }
        }
      });
      return seq;
    } else {
      return null;
    }
  },

  render() {
    let {width, sideWidth} = this.props;
    return (
      <ChannelWithConfigDrawer
        height={HEIGHT}
        width={width}
        sideWidth={sideWidth}
        sideComponent={<Side />}
        legendComponent={<Legend getSeq={this.getSeq}/>}
      >
        <canvas ref={(ref) => this.canvas = ref} width={width - sideWidth} height={HEIGHT}/>
      </ChannelWithConfigDrawer>
    );
  },
});

class Side extends React.Component {
  render() {
    return <div className="side-name">Ref. Seq.</div>;
  }
}

class Legend extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      copyControl: <div></div>,
    };
    this.handleClick = this.handleClick.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return nextState.copyControl !== this.state.copyControl;
  }

  handleClick() {
    const sequenceText = this.props.getSeq();
    if (sequenceText !== null) {
      const copyControl = (
        <CopyToClipboard text={sequenceText}>
          <div style={{textAlign: 'center'}}>
            <div style={{overflowWrap: 'break-word', overflow: 'auto', maxWidth: '500px'}}>{sequenceText}</div>
            <Button
              color="inherit"
              style={{textTransform: 'none'}}
              label="Click here to copy to clipboard"
            />
          </div>
        </CopyToClipboard>
      );
      this.setState({copyControl});
    } else {
      this.setState({copyControl: <div>Zoom in until the sequence is not summarised, then try again.</div>});
    }
  }

  render() {
    return <div className="legend">
      {[
        ['A', 'rgb(255, 50, 50)'],
        ['T', 'rgb(255, 170, 0)'],
        ['C', 'rgb(0, 128, 192)'],
        ['G', 'rgb(0, 192, 120)'],
        ['N', 'rgb(0,0,0)']
      ].map(([base, colour]) => (
        <LegendElement key={base} name={base} colour={colour}/>
      ))}
      <div style={{paddingLeft: '10px'}}>(Majority base over window)</div>
      <Tooltip
        placement={'bottom'}
        trigger={'click'}
        overlay={this.state.copyControl}
      >
        <Button
          label="Get sequence"
          color="primary"
          onClick={this.handleClick}
          iconName="copy"
        />
      </Tooltip>
    </div>;
  }
}

Legend.propTypes = {
  getSeq: PropTypes.func
};

export default ReferenceSequence;
