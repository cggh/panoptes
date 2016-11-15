import React from 'react';
import Color from 'color';

import _min from 'lodash/min';
import _max from 'lodash/max';
import _sum from 'lodash/sum';
import _sumBy from 'lodash/sumBy';
import _debounce from 'lodash/debounce';
import _sortedIndex from 'lodash/sortedIndex';
import _sortedLastIndex from 'lodash/sortedLastIndex';
import _isFinite from 'lodash/isFinite';

import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import {findBlock, regionCacheGet} from 'util/PropertyRegionCache';
import ErrorReport from 'panoptes/ErrorReporter';
import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';

const DRAW_POINTS_THRESHOLD = 1000;

let NumericalSummaryTrack = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'width',
        'height',
        'colour',
        'hideMinMax'
      ]
    }),
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'table,', 'track', 'width', 'height', 'yMin', 'yMax', 'autoYScale')
  ],

  propTypes: {
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number, //Provided by ScaledSVGChannel
    end: React.PropTypes.number, //Provided by ScaledSVGChannel
    height: React.PropTypes.number,
    width: React.PropTypes.number,
    colour: React.PropTypes.string,
    hideMinMax: React.PropTypes.bool,
    autoYScale: React.PropTypes.bool,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number,
    onYLimitChange: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
    track: React.PropTypes.string.isRequired,
    onChangeLoadStatus: React.PropTypes.func,
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.blocks = [];
    this.pointsBlocks = [];
    this.debouncedYScale = _debounce(this.calculateYScale, 200);
  },
  componentWillUnmount() {
    this.props.onYLimitChange({dataYMin: null, dataYMax: null});
  },

  componentDidUpdate() {
    this.draw(this.props, this.blocks);
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(nextProps, requestContext) {
    let {chromosome, start, end, width, table, track, autoYScale} = nextProps;
    const tableConfig = this.config.tablesById[table];
    if (this.props.chromosome !== chromosome ||
      this.props.track !== track ||
      this.props.table !== table) {
      this.applyData(nextProps, []);
    }
    if (width < 1) {
      return;
    }
    if (!tableConfig ||
      !tableConfig.propertiesById[track] ||
      !tableConfig.propertiesById[track].showInBrowser ||
      !tableConfig.propertiesById[track].isNumerical
    ) {
      ErrorReport(this.getFlux(), `${table}/${track} is not a valid numerical summary track`);
      return;
    }
    const {blockLevel, blockIndex, needNext, summaryWindow} = findBlock({start, end, width});
    //If we already at this block then don't change it!
    if (this.props.chromosome !== chromosome ||
       this.props.track !== track ||
       this.props.table !== table ||
       !(this.blockLevel === blockLevel
         && this.blockIndex === blockIndex
         && this.needNext === needNext
         && this.requestSummaryWindow === summaryWindow
       )) {
      //Current block was unacceptable so choose best one
      this.blockLevel = blockLevel;
      this.blockIndex = blockIndex;
      this.needNext = needNext;
      this.requestSummaryWindow = summaryWindow;
      this.props.onChangeLoadStatus('LOADING');
      const columns = [
        {expr: ['/', [tableConfig.position, summaryWindow]], as: 'window'},
        {expr: ['count', ['*']], as: 'count'},
        {expr: ['avg', [track]], as: 'avg'},
        {expr: ['min', [track]], as: 'min'},
        {expr: ['max', [track]], as: 'max'}
      ];
      const query = SQL.WhereClause.CompareFixed(tableConfig.chromosome, '=', chromosome);
      let APIargs = {
        database: this.config.dataset,
        table,
        columns: columns,
        query: SQL.WhereClause.encode(query),
        groupBy: ['window'],
        orderBy: [['asc', 'window']],
        transpose: false,
        typedArrays: true
      };
      let cacheArgs = {
        method: 'query',
        regionField: tableConfig.position,
        queryField: 'query',
        start,
        end,
        useWiderBlocksIfInCache: true,
        isBlockTooBig: () => false,
        postProcessBlock: (block) => {
          block.numPoints = _sum(block.count.array);
          return block;
        }
      };

      requestContext.request((componentCancellation) =>
        regionCacheGet(APIargs, cacheArgs, componentCancellation)
          .then((blocks) => {
            const numPoints = _sumBy(blocks, 'numPoints');
            this.applyData(this.props, blocks, summaryWindow, numPoints > DRAW_POINTS_THRESHOLD);
            if (numPoints <= DRAW_POINTS_THRESHOLD) {
              return regionCacheGet(
                {
                  ...APIargs,
                  columns: [
                    {expr: tableConfig.position, as: 'pos'},
                    {expr: track, as: 'value'}
                  ],
                  groupBy: [],
                  orderBy: []
                },
                {
                  ...cacheArgs,
                  postProcessBlock: undefined
                },
                componentCancellation)
                .then((pointsBlocks) => {
                  this.applyPointsData(this.props, pointsBlocks);
                  this.props.onChangeLoadStatus('DONE');
                });
            } else {
              this.props.onChangeLoadStatus('DONE');
            }
          })
          .catch((err) => {
            this.props.onChangeLoadStatus('DONE');
            throw err;
          })
          .catch(API.filterAborted)
          .catch(LRUCache.filterCancelled)
          .catch((error) => {
            this.applyData(this.props, []);
            ErrorReport(this.getFlux(), error.message, () => this.fetchData(nextProps, requestContext));
            throw error;
          })
      );
    }
    //If we fetched or not, still draw if props have changed
    if (['start', 'end', 'yMin', 'yMax'].some((name) => this.props[name] !== nextProps[name])) {
      this.draw(nextProps);
    }
    if (autoYScale && ['start', 'end,', 'autoYScale'].some((name) => this.props[name] !== nextProps[name])) {
      this.debouncedYScale(nextProps);
    }
  },

  applyData(props, blocks, summaryWindow, clearPoints) {
    this.blocks = blocks;
    if (clearPoints) {
      this.pointsBlocks = [];
    }
    this.summaryWindow = summaryWindow;
    this.draw(props);
    this.debouncedYScale(props);
  },

  applyPointsData(props, blocks) {
    this.pointsBlocks = blocks;
    this.draw(props);
  },

  draw(props) {
    const {yMin, yMax, height, start, end, width, colour, hideMinMax} = props;
    if (!this.refs.canvas) {
      return;
    }
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.summaryWindow || !this.blocks || this.blocks.length < 1 ||
        !_isFinite(yMin) || !_isFinite(yMax)
    ) {
      return;
    }
    const nullVal = API.nullValues[this.blocks[0].min.type];
    const windowSize = this.summaryWindow;
    const xScaleFactor = width / (end - start);
    const yScaleFactor = height / (yMax - yMin);
    const pixelWindowSize = windowSize * xScaleFactor;
    //Max and min
    if (!hideMinMax) {
      ctx.beginPath();
      this.blocks.forEach((block) => {
        const window = block.window.array;
        const min = block.min.array;
        const max = block.max.array;
        for (let i = 0, iEnd = window.length; i < iEnd; i++) {
          if (min[i] !== nullVal && min[i] == +min[i]) {  //If min is null then max, avg should be
            const xPixel = xScaleFactor * (-0.5 + window[i] * windowSize - start);
            const yMinPixel = height - (yScaleFactor * (min[i] - yMin));
            const yMaxPixel = height - (yScaleFactor * (max[i] - yMin));
            ctx.moveTo(xPixel, yMinPixel);
            ctx.lineTo(xPixel + pixelWindowSize, yMinPixel);
            ctx.lineTo(xPixel + pixelWindowSize, yMaxPixel);
            ctx.lineTo(xPixel, yMaxPixel);
          }
          lastPointNull = (min[i] === nullVal || min[i] != +min[i]);
          lastWindow = window[i];
        }
      });
      ctx.fillStyle = Color(colour).clearer(0.8).rgbString();
      ctx.fill();
    }
    let lastPointNull = true;
    let lastWindow = null;
    //Avg line
    ctx.beginPath();
    this.blocks.forEach((block) => {
      const window = block.window.array;
      const avg = block.avg.array;
      for (let i = 0, iEnd = window.length; i < iEnd; i++) {
        if (avg[i] !== nullVal && avg[i] == +avg[i]) {  //If min is null then max, avg should be, check also for NaN as that is the NULL value for float types
          const xPixel = xScaleFactor * (-0.5 + window[i] * windowSize - start);
          const yPixel = height - (yScaleFactor * (avg[i] - yMin));
          if (lastPointNull || window[i] !== lastWindow + 1) {
            ctx.moveTo(xPixel, yPixel);
          } else {
            ctx.lineTo(xPixel, yPixel);
          }
          ctx.lineTo(xPixel + pixelWindowSize, yPixel);
        }
        lastPointNull = (avg[i] === nullVal || avg[i] != +avg[i]);
        lastWindow = window[i];
      }
    });
    ctx.strokeStyle = colour;
    ctx.stroke();
    // Circles for single data points
    ctx.beginPath();
    this.pointsBlocks.forEach((block) => {
      const pos = block.pos.array;
      const value = block.value.array;
      for (let i = 0, iEnd = pos.length; i < iEnd; i++) {
        const xPixel = xScaleFactor * (-0.5 + pos[i] - start);
        const yPixel = height - (yScaleFactor * (value[i] - yMin));
        ctx.moveTo(xPixel, yPixel);
        ctx.arc(xPixel, yPixel, 2, 0, 2 * Math.PI, false);
      }
    });
    ctx.fillStyle = Color(colour).clearer(0.8).rgbString();
    ctx.fill();
    ctx.strokeStyle = Color(colour).clearer(0.5).rgbString()
    ctx.stroke();
  },

  calculateYScale(props) {
    const {table, track} = props;
    if (this.blocks && this.summaryWindow) {
      let {start, end} = props;
      let min = [];
      let max = [];
      this.blocks.forEach((block) => {
        const startIndex = _sortedIndex(block.window.array, start / this.summaryWindow);
        const endIndex = _sortedLastIndex(block.window.array, end / this.summaryWindow);
        min.push(_min(block.min.array.subarray(startIndex, endIndex)));
        max.push(_max(block.max.array.subarray(startIndex, endIndex)));
      });
      min = _min(min);
      max = _max(max);
      if (min === max) {
        min = min - 0.1 * min;
        max = max + 0.1 * max;
      } else {
        let margin = 0.1 * (max - min);
        min = min - margin;
        max = max + margin;
      }
      this.props.onYLimitChange({
        dataYMin: min,
        dataYMax: max
      });
    } else {
      const config = this.config.tablesById[table].propertiesById[track];
      this.props.onYLimitChange({
        dataYMin: config.minVal,
        dataYMax: config.maxVal
      });
    }
  },


  render() {
    const {width, height} = this.props;
    return (
      <canvas ref="canvas" width={width} height={height}/>
    );
  }

});

export default NumericalSummaryTrack;
