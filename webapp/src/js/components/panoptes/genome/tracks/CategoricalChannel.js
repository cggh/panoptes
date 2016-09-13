import React from 'react';
import _isFinite from 'lodash/isFinite';
import _debounce from 'lodash/debounce';
import _map from 'lodash/map';
import _max from 'lodash/max';
import _uniq from 'lodash/uniq';
import _sum from 'lodash/sum';
import _sortedIndex from 'lodash/sortedIndex';
import _sortedLastIndex from 'lodash/sortedLastIndex';


import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import {propertyColour} from 'util/Colours';
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import API from 'panoptes/API';
import CanvasGroupChannel from 'panoptes/genome/tracks/CanvasGroupChannel';
import ErrorReport from 'panoptes/ErrorReporter';
import PropertyLegend from 'panoptes/PropertyLegend';
import {findBlock, regionCacheGet} from 'util/PropertyRegionCache';

import Checkbox from 'material-ui/Checkbox';


let CategoricalChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'componentUpdate',
        'onClose'
      ]
    })
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    autoYScale: React.PropTypes.bool,
    fractional: React.PropTypes.bool,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number,
    name: React.PropTypes.string,
    onClose: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
    track: React.PropTypes.string.isRequired
  },

  getInitialState() {
    return {
      knownValues: []
    };
  },

  getDefaultProps() {
    return {
      height: 100,
      autoYScale: true
    };
  },

  render() {
    const {table, track, width, sideWidth, name} = this.props;
    const {knownValues} = this.state;
    return (
      <CanvasGroupChannel {...this.props}
                          side={<span>{name}</span>}
                          onClose={this.redirectedProps.onClose}
                          controls={<CategoricalTrackControls {...this.props} componentUpdate={this.redirectedProps.componentUpdate} />}
                          legend={<PropertyLegend table={table} property={track} knownValues={knownValues} />}
      >
        <CategoricalTrack {...this.props} width={width - sideWidth} onChangeKnownValues={(knownValues) => this.setState({knownValues})}/>
      </CanvasGroupChannel>
    );
  }
});


let CategoricalTrack = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'width',
        'height'
      ]
    }),
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'table,', 'track', 'width', 'height', 'yMin', 'yMax', 'fractional', 'autoYScale')
  ],

  propTypes: {
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    autoYScale: React.PropTypes.bool,
    fractional: React.PropTypes.bool,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number,
    table: React.PropTypes.string.isRequired,
    track: React.PropTypes.string.isRequired,
    onChangeKnownValues: React.PropTypes.func.isRequired,
    onChangeLoadStatus: React.PropTypes.func.isRequired,
    onYLimitChange: React.PropTypes.func.isRequired
  },

  componentWillMount() {
    this.blocks = [];
    this.debouncedYScale = _debounce(this.calculateYScale, 200);
  },

  componentDidUpdate() {
    this.draw(this.props, this.blocks);
  },

  getDefaultProps() {
    return {
      autoYScale: true,
      fractional: false
    };
  },

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
      !(tableConfig.propertiesById[track].isCategorical || tableConfig.propertiesById[track].isBoolean)
    ) {
      ErrorReport(this.getFlux(), `${table}/${track} is not a valid categorical summary track`);
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
        track
      ];
      const query = SQL.WhereClause.CompareFixed(tableConfig.chromosome, '=', chromosome);
      let APIargs = {
        database: this.config.dataset,
        table,
        columns: columns,
        query: SQL.WhereClause.encode(query),
        groupBy: ['window', track],
        orderBy: [['asc', 'window'], ['asc', track]],
        transpose: false,
      };
      let cacheArgs = {
        method: 'query',
        regionField: tableConfig.position,
        queryField: 'query',
        start,
        end,
        useWiderBlocksIfInCache: false,
        isBlockTooBig: () => false,
        postProcessBlock: (block) => this.rearrangeData(track, block)
      };

      requestContext.request((componentCancellation) =>
        regionCacheGet(APIargs, cacheArgs, componentCancellation)
          .then((blocks) => {
            this.props.onChangeLoadStatus('DONE');
            this.applyData(this.props, blocks, summaryWindow);
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
    if (['start', 'end', 'yMin', 'yMax', 'fractional'].some((name) => this.props[name] !== nextProps[name])) {
      this.draw(nextProps);
    }
    if (autoYScale && ['start', 'end,', 'autoYScale', 'fractional'].some((name) => this.props[name] !== nextProps[name])) {
      this.debouncedYScale(nextProps);
    }
  },

  rearrangeData(track, block) {
    block._counts_ = [];
    block._values_ = [];
    block._windows_ = [];
    const count = block.count.array;
    const value = block[track].array;
    const window = block.window.array;
    if (window.length > 0) {
      let lastWindow = window[0];
      let lastWindowValues = [value[0]];
      let lastWindowCounts = [count[0]];
      //Due to sorting we know the data is in window order with the most frequent value first
      for (let i = 1, iEnd = window.length + 1; i < iEnd; ++i) { //One past the end so we draw the last window
        if (window[i] === lastWindow) {
          lastWindowValues.push(value[i]);
          lastWindowCounts.push(count[i]);
        } else {
          block._windows_.push(lastWindow);
          block._values_.push(lastWindowValues);
          block._counts_.push(lastWindowCounts);
          lastWindow = window[i];
          lastWindowValues = [value[i]];
          lastWindowCounts = [count[i]];
        }
      }
    }
    return block;
  },

  applyData(props, blocks, summaryWindow) {
    this.blocks = blocks;
    this.summaryWindow = summaryWindow;
    this.draw(props);
    this.debouncedYScale(props);
  },

  draw(props) {
    const {yMin, yMax, height, start, end, width, fractional, table, track} = props;
    if (!this.refs.canvas) {
      return;
    }
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.summaryWindow || !this.blocks || this.blocks.length < 1 || !_isFinite(yMin) || !_isFinite(yMax)
    ) {
      return;
    }
    const colours = propertyColour(this.config.tablesById[table].propertiesById[track]);
    const windowSize = this.summaryWindow;
    const xScaleFactor = width / (end - start);
    const yScaleFactor = height / (yMax - yMin);
    const pixelWindowSize = windowSize * xScaleFactor;
    this.blocks.forEach((block) => {
      const counts = block._counts_;
      const values = block._values_;
      const window = block._windows_;
      for (let i = 0, iEnd = window.length; i < iEnd; i++) {
        const xPixel = xScaleFactor * (-0.5 + window[i] * windowSize - start);
        if (xPixel > -pixelWindowSize && xPixel < width + pixelWindowSize) {
          let currentY = height - (yScaleFactor * (0 - yMin));
          const iCounts = counts[i];
          const iValues = values[i];
          const sum = fractional ? _sum(iCounts) : 1;
          for (let j = 0, jEnd = iCounts.length; j < jEnd; j++) {
            ctx.fillStyle = colours(iValues[j]);
            const countHeight = yScaleFactor * (iCounts[j] / sum);
            ctx.fillRect(Math.floor(xPixel), currentY, Math.ceil(pixelWindowSize), -countHeight);
            currentY -= countHeight;
          }
        }
      }

    });
  },

  calculateYScale(props) {
    const {fractional} = props;
    if (fractional) {
      this.props.onYLimitChange({
        dataYMin: -0.1,
        dataYMax: 1.1
      });
      return;
    }

    if (this.blocks && this.summaryWindow) {
      let {start, end} = props;
      let max = [];
      let knownValues = [];
      this.blocks.forEach((block) => {

        const startIndex = _sortedIndex(block._windows_, start / this.summaryWindow);
        const endIndex = _sortedLastIndex(block._windows_, end / this.summaryWindow);
        max.push(_max(_map(block._counts_.slice(startIndex, endIndex), _sum)));
        Array.prototype.push.apply(knownValues, block._values_.slice(startIndex, endIndex));
      });
      let min = 0;
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
      this.props.onChangeKnownValues(_uniq(knownValues));
    }
  },

  render() {
    let {width, height} = this.props;
    return (
        <canvas className="categorical" ref="canvas" width={width} height={height}/>
    );
  }
});

let CategoricalTrackControls = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'autoYScale',
        'yMin',
        'yMax'
      ],
      redirect: ['componentUpdate']
    })
  ],

  propTypes: {
    autoYScale: React.PropTypes.bool,
    fractional: React.PropTypes.bool,
    yMin: React.PropTypes.number,
    yMax: React.PropTypes.number,
  },

  render() {
    let {fractional, autoYScale, yMin, yMax} = this.props;
    return (
      <div className="channel-controls">
        <div className="control">
          <div className="label">Fractional:</div>
          <Checkbox
            name="fractional"
            defaultChecked={fractional}
            style={{width: 'inherit'}}
            onCheck={(e, checked) => this.redirectedProps.componentUpdate({fractional: checked})}/>
        </div>
        <div className="control">
          <div className="label">Auto Y Scale:</div>
          <Checkbox
            name="autoYScale"
            defaultChecked={autoYScale}
            style={{width: 'inherit'}}
            onCheck={(e, checked) => this.redirectedProps.componentUpdate({autoYScale: checked})}/>
        </div>
        {!autoYScale ? <div className="control">
          <div className="label">Y Min:</div>
          <input className="numeric-input"
                 ref="yMin"
                 type="number"
                 value={yMin}
                 onChange={() => {
                   let value = parseFloat(this.refs.yMin.value);
                   if (_isFinite(value))
                     this.redirectedProps.componentUpdate({yMin: value});
                 }
                                }/>
        </div>
          : null}
        {!autoYScale ? <div className="control">
          <div className="label">Y Max:</div>
          <input className="numeric-input"
                 ref="yMax"
                 type="number"
                 value={yMax}
                 onChange={() => {
                   let value = parseFloat(this.refs.yMax.value);
                   if (_isFinite(value))
                     this.redirectedProps.componentUpdate({yMax: value});
                 }
                                }/>
        </div>
          : null}

      </div>
    );
  }

});


module.exports = CategoricalChannel;


