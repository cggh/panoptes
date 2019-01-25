import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import _isFinite from 'lodash.isfinite';
import _debounce from 'lodash.debounce';
import _map from 'lodash.map';
import _max from 'lodash.max';
import _uniq from 'lodash.uniq';
import _sum from 'lodash.sum';
import _sortedIndex from 'lodash.sortedindex';
import _sortedLastIndex from 'lodash.sortedlastindex';

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
import QueryString from 'panoptes/QueryString';
import FilterButton from 'panoptes/FilterButton';
import TooltipEllipsis from 'ui/TooltipEllipsis';

import Checkbox from '@material-ui/core/Checkbox';


let CategoricalChannel = createReactClass({
  displayName: 'CategoricalChannel',

  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderWithRedirectedProps({
      redirect: [
        'setProps',
        'onClose'
      ]
    })
  ],

  propTypes: {
    setProps: PropTypes.func,
    chromosome: PropTypes.string,
    start: PropTypes.number,
    end: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    sideWidth: PropTypes.number,
    autoYScale: PropTypes.bool,
    fractional: PropTypes.bool,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
    onClose: PropTypes.func,
    table: PropTypes.string.isRequired,
    track: PropTypes.string.isRequired,
    query: PropTypes.string
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

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  render() {
    let {table, track, width, sideWidth, query} = this.props;
    const {knownValues} = this.state;
    query = this.getDefinedQuery(query, table);
    return (
      <CanvasGroupChannel {...this.props}
        side={<Side {...this.props} query={query}/>}
        onClose={this.redirectedProps.onClose}
        controls={<CategoricalTrackControls {...this.props} query={query} setProps={this.redirectedProps.setProps} />}
        legend={<PropertyLegend table={table} property={track} knownValues={knownValues} />}
      >
        <CategoricalTrack {...this.props} query={query} width={width - sideWidth} onChangeKnownValues={(knownValues) => this.setState({knownValues})}/>
      </CanvasGroupChannel>
    );
  },
});


let CategoricalTrack = createReactClass({
  displayName: 'CategoricalTrack',

  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'width',
        'height'
      ]
    }),
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'table,', 'track', 'query', 'width', 'height', 'yMin', 'yMax', 'fractional', 'autoYScale')
  ],

  propTypes: {
    chromosome: PropTypes.string,
    start: PropTypes.number,
    end: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    autoYScale: PropTypes.bool,
    fractional: PropTypes.bool,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
    table: PropTypes.string.isRequired,
    track: PropTypes.string.isRequired,
    query: PropTypes.string,
    onChangeKnownValues: PropTypes.func,
    onChangeLoadStatus: PropTypes.func,
    onYLimitChange: PropTypes.func
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
    let {chromosome, start, end, width, table, track, query, autoYScale} = nextProps;
    const tableConfig = this.config.tablesById[table];
    if (this.props.chromosome !== chromosome ||
      this.props.track !== track ||
      this.props.query !== query ||
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
      this.props.query !== query ||
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
      query = SQL.WhereClause.AND([query ? SQL.WhereClause.decode(query) : SQL.WhereClause.Trivial(), SQL.WhereClause.CompareFixed(tableConfig.chromosome, '=', chromosome)]);
      let APIargs = {
        database: this.config.dataset,
        table,
        columns,
        query: SQL.WhereClause.encode(query),
        groupBy: ['window', track],
        orderBy: [['asc', 'window'], ['asc', track]],
        transpose: false,
        typedArrays: true
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
    if (!this.canvas) {
      return;
    }
    const canvas = this.canvas;
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
      <canvas className="categorical" ref={(ref) => this.canvas = ref} width={width} height={height}/>
    );
  },
});

let CategoricalTrackControls = createReactClass({
  displayName: 'CategoricalTrackControls',

  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'autoYScale',
        'yMin',
        'yMax',
        'table',
        'query'
      ],
      redirect: ['setProps']
    })
  ],

  propTypes: {
    autoYScale: PropTypes.bool,
    fractional: PropTypes.bool,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
    query: PropTypes.string,
    table: PropTypes.string
  },

  handleQueryPick(query) {
    this.redirectedProps.setProps({query});
  },

  render() {
    let {fractional, autoYScale, yMin, yMax, table, query} = this.props;
    return (
      <div className="channel-controls">
        <div className="control-group">
          {table ? <div className="control">
            <QueryString prepend="Filter:" table={table} query={query} />
          </div> : null}
          {table ? <div className="control">
            <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
          </div> : null}
        </div>
        <div className="control">
          <div className="label">Fractional:</div>
          <Checkbox
            color="primary"
            name="fractional"
            checked={fractional}
            style={{width: 'inherit'}}
            onChange={(e, checked) => this.redirectedProps.setProps({fractional: checked})}/>
        </div>
        <div className="control-group">
          <div className="control">
            <div className="label">Auto Y Scale:</div>
            <Checkbox
              color="primary"
              name="autoYScale"
              checked={autoYScale}
              style={{width: 'inherit'}}
              onChange={(e, checked) => this.redirectedProps.setProps({autoYScale: checked})}/>
          </div>
          {!autoYScale ? <div className="control">
            <div className="label">Y min:</div>
            <input className="numeric-input"
              ref={(ref) => this.yMin = ref}
              type="number"
              value={yMin}
              onChange={() => {
                let value = parseFloat(this.yMin.value);
                if (_isFinite(value))
                  this.redirectedProps.setProps({yMin: value});
              }
              }/>
          </div>
            : null}
          {!autoYScale ? <div className="control">
            <div className="label">Y max:</div>
            <input className="numeric-input"
              ref={(ref) => this.yMax = ref}
              type="number"
              value={yMax}
              onChange={() => {
                let value = parseFloat(this.yMax.value);
                if (_isFinite(value))
                  this.redirectedProps.setProps({yMax: value});
              }
              }/>
          </div>
            : null}
        </div>
      </div>
    );
  },
});

let Side = createReactClass({
  displayName: 'Side',

  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderWithRedirectedProps({
      check: [
        'table',
        'query',
        'track'
      ],
    })
  ],

  render() {
    let {query, table, track} = this.props;
    return (
      <div className="side-name">
        <div>{((query !== SQL.nullQuery) && table ? 'Filtered ' : '') + (table ? `${this.tableConfig().capNamePlural}:` : '')}</div>
        <div className="legend-element">

          <TooltipEllipsis className="label">
            {this.tableConfig().propertiesById[track].name}
          </TooltipEllipsis>
        </div>
      </div>
    );
  },
});



export default CategoricalChannel;
