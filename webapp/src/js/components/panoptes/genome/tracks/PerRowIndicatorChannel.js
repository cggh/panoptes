import React from 'react';

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import Color from 'color';

import _map from 'lodash/map';
import _isEqual from 'lodash/isEqual';
import _transform from 'lodash/transform';
import _filter from 'lodash/filter';

import SQL from 'panoptes/SQL';
import {findBlock, regionCacheGet, combineBlocks} from 'util/PropertyRegionCache';
import ErrorReport from 'panoptes/ErrorReporter';
import PropertySelector from 'panoptes/PropertySelector';
import PropertyLegend from 'panoptes/PropertyLegend';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import {hatchRect} from 'util/CanvasDrawing';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import FilterButton from 'panoptes/FilterButton';

import {propertyColour} from 'util/Colours';

const HEIGHT = 50;

let PerRowIndicatorChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'setProps',
        'onClose'
      ],
      check: [
        'chromosome',
        'width',
        'sideWidth',
        'name',
        'table',
        'colourProperty',
        'query'
      ]
    }),
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'table', 'query', 'width', 'sideWidth', 'colourProperty')
  ],

  propTypes: {
    setProps: React.PropTypes.func,
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number,
    name: React.PropTypes.string,
    onClose: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    colourProperty: React.PropTypes.string,
    onChangeLoadStatus: React.PropTypes.func
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined
    };
  },

  getInitialState() {
    return {
      knownValues: null
    };
  },

  componentWillMount() {
    this.positions = [];
    this.tooBigBlocks = [];
  },

  componentDidMount() {
    this.draw(this.props);
  },

  componentDidUpdate() {
    this.draw(this.props);
  },

  getDefinedQuery(query) {
    let definedQuery = query;
    if (definedQuery === undefined) {
      definedQuery = this.tableConfig().defaultQuery !== undefined ? this.tableConfig().defaultQuery : SQL.nullQuery;
    }
    return definedQuery;
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth, table, query, colourProperty} = props;

    if (this.props.chromosome !== chromosome ||
      this.props.table !== table) {
      this.applyData(props, []);
    }
    if (width - sideWidth < 1) {
      return;
    }
    if (colourProperty && !this.tableConfig().propertiesById[colourProperty]) {
      ErrorReport(this.getFlux(), `Per ${table} channel: ${colourProperty} is not a valid property of ${table}`);
      return;
    }
    const {blockLevel, blockIndex, needNext} = findBlock({start, end});
    //If we already at this block then don't change it!
    if (this.props.chromosome !== chromosome ||
        this.props.table !== table ||
        this.getDefinedQuery(this.props.query) !== this.getDefinedQuery(query) ||
        this.props.colourProperty !== colourProperty ||
        !(this.blockLevel === blockLevel
          && this.blockIndex === blockIndex
          && this.needNext === needNext)) {
      //Current block was unacceptable so choose best one
      this.blockLevel = blockLevel;
      this.blockIndex = blockIndex;
      this.needNext = needNext;
      this.props.onChangeLoadStatus('LOADING');
      let columns = [this.tableConfig().primKey, this.tableConfig().position];
      if (colourProperty)
        columns.push(colourProperty);
      let decodedQuery = SQL.WhereClause.decode(this.getDefinedQuery(query));
      decodedQuery = SQL.WhereClause.AND([SQL.WhereClause.CompareFixed(this.tableConfig().chromosome, '=', chromosome), decodedQuery]);
      let APIargs = {
        database: this.config.dataset,
        table,
        columns: columns,
        query: SQL.WhereClause.encode(decodedQuery),
        transpose: false,
        typedArrays: true,
        start: 0
      };
      let cacheArgs = {
        method: 'query',
        regionField: this.tableConfig().position,
        queryField: 'query',
        limitField: 'stop',
        start,
        end,
        blockLimit: 1000,
        useWiderBlocksIfInCache: true
      };
      requestContext.request((componentCancellation) =>
        regionCacheGet(APIargs, cacheArgs, componentCancellation)
          .then((blocks) => {
            this.props.onChangeLoadStatus('DONE');
            this.applyData(this.props, blocks);
          }))
        .catch((err) => {
          this.props.onChangeLoadStatus('DONE');
          throw err;
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((error) => {
          this.applyData(this.props, []);
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(this.props, requestContext));
          throw error;
        });
    }
    this.draw(props);
  },

  applyData(props, blocks) {
    let {table, colourProperty} = props;
    this.positions = combineBlocks(blocks, this.tableConfig().position);
    if (colourProperty) {
      this.colourData = combineBlocks(blocks, colourProperty);
      this.colourVals = _map(this.colourData,
        propertyColour(this.config.tablesById[table].propertiesById[colourProperty]));
      this.colourVals = _map(this.colourVals, (colour) => Color(colour).clearer(0.2).rgbString());
      this.colourValsTranslucent = _map(this.colourVals, (colour) => Color(colour).clearer(0.4).rgbString());
    } else {
      this.colourVals = null;
      this.colourData = null;
    }
    //Filter out big blocks and merge neighbouring ones.
    this.tooBigBlocks = _transform(_filter(blocks, {_tooBig: true}), (merged, block) => {
      const lastBlock = merged[merged.length - 1];
      if (lastBlock && lastBlock._blockStart + lastBlock._blockSize === block._blockStart) {
        //Copy to avoid mutating the cache
        merged[merged.length - 1] = {...lastBlock, _blockSize: lastBlock._blockSize + block._blockSize};
      } else {
        merged.push(block);
      }
    });
    this.draw(props);
  },

  hatchRect(ctx, x1, y1, dx, dy, delta) {
    ctx.rect(x1, y1, dx, dy);
    ctx.save();
    ctx.clip();
    let majorAxis = Math.max(dx, dy);
    ctx.beginPath();
    for (let n = -1 * (majorAxis) ; n < majorAxis; n += delta) {
      ctx.moveTo(n + x1, y1);
      ctx.lineTo(dy + n + x1, y1 + dy);
    }
    ctx.stroke();
    ctx.restore();
  },

  draw(props) {
    const {table, width, sideWidth, start, end, colourProperty} = props;
    const positions = this.positions;
    const colours = this.colourVals;
    const coloursTranslucent = this.colourValsTranslucent;
    const colourData = this.colourData;
    let drawnColourVals = new Set();
    const recordColours = colourProperty && this.config.tablesById[table].propertiesById[colourProperty].isText;
    const canvas = this.refs.canvas;
    if (!canvas)
      return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px Roboto';
    let psy = (HEIGHT / 2) - 12;
    const scaleFactor = ((width - sideWidth) / (end - start));
    this.tooBigBlocks.forEach((block) => {
      const pixelStart = scaleFactor * (block._blockStart - start);
      const pixelSize = scaleFactor * ( block._blockSize);
      const textPos = (pixelStart < 0 && pixelStart + pixelSize > width - sideWidth) ? (width - sideWidth) / 2 : pixelStart + (pixelSize / 2);
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
    ctx.restore();
    //Triangles/Lines
    psy = (HEIGHT / 2) - 6;
    const numPositions = positions.length;
    const triangleMode = numPositions < (width - sideWidth);
    ctx.strokeStyle = triangleMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)';
    ctx.fillStyle = 'rgba(214, 39, 40, 0.6)';
    for (let i = 0, l = numPositions; i < l; ++i) {
      const psx = scaleFactor * (positions[i] - start);
      if (psx > -6 && psx < width + 6) {
        if (colours) {
          if (triangleMode) {
            ctx.fillStyle = coloursTranslucent[i];
          } else {
            ctx.strokeStyle = colours[i];
          }
          if (recordColours) {
            drawnColourVals.add(colourData[i]);
          }
        }
        ctx.beginPath();
        ctx.moveTo(psx, psy);
        if (triangleMode) {
          ctx.lineTo(psx + 6, psy + 12);
          ctx.lineTo(psx - 6, psy + 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.lineTo(psx, psy + 12);
          ctx.stroke();
        }
      }
    }
    //Record drawn values for legend
    drawnColourVals = Array.from(drawnColourVals.values());
    if (recordColours) {
      if (!_isEqual(this.state.knownValues, drawnColourVals)) {
        this.setState({knownValues: drawnColourVals});
      }
    } else if (this.state.knownValues) {
      this.setState({knownValues: null});
    }

  },

  render() {
    let {width, sideWidth, table, colourProperty, query} = this.props;
    const {knownValues} = this.state;
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={HEIGHT}
        sideComponent={
          <div className="side-name">
            <span>{name || this.config.tablesById[table].capNamePlural}</span>
            </div>
            }
        //Override component update to get latest in case of skipped render
        configComponent={<PerRowIndicatorControls {...this.props} query={this.getDefinedQuery(query)} setProps={this.redirectedProps.setProps} />}
        legendComponent={colourProperty ? <PropertyLegend table={table} property={colourProperty} knownValues={knownValues} /> : null}
        onClose={this.redirectedProps.onClose}
      >
        <canvas ref="canvas" width={width} height={HEIGHT}/>
      </ChannelWithConfigDrawer>);
  }
});

const PerRowIndicatorControls = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'colourProperty',
        'query'
      ],
      redirect: ['setProps']
    }),
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    colourProperty: React.PropTypes.string
  },

  handleQueryPick(query) {
    this.redirectedProps.setProps({query});
  },

  render() {
    let {table, colourProperty} = this.props;

    return (
      <div className="channel-controls">
        <div className="control">
          <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
        </div>
        <div className="control">
          <div className="label">Colour By:</div>
          <PropertySelector table={table}
                            value={colourProperty}
                            onSelect={(colourProperty) => this.redirectedProps.setProps({colourProperty})} />
        </div>
      </div>
    );
  }

});

module.exports = PerRowIndicatorChannel;
