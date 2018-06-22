import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import Tooltip from 'rc-tooltip';
import Color from 'color';
import Hammer from 'react-hammerjs'; //We need hammer as "onClick" would fire for panning moves

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import _map from 'lodash.map';
import _isEqual from 'lodash.isequal';
import _transform from 'lodash.transform';
import _filter from 'lodash.filter';

import SQL from 'panoptes/SQL';
import {findBlock, regionCacheGet, combineBlocks} from 'util/PropertyRegionCache';
import ErrorReport from 'panoptes/ErrorReporter';
import PropertySelector from 'panoptes/PropertySelector';
import PropertyLegend from 'panoptes/PropertyLegend';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import {hatchRect} from 'util/CanvasDrawing';
import QueryString from 'panoptes/QueryString';
import PropertyCell from 'panoptes/PropertyCell';
import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import FilterButton from 'panoptes/FilterButton';
import {propertyColour} from 'util/Colours';
import _forEach from 'lodash.foreach';

const HEIGHT = 50;

let PerRowIndicatorChannel = createReactClass({
  displayName: 'PerRowIndicatorChannel',

  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'setProps',
        'onClose',
        'onChangeHoverPos'
      ],
      check: [
        'start',
        'end',
        'chromosome',
        'width',
        'sideWidth',
        'name',
        'table',
        'colourProperty',
        'query',
        'hoverPos'
      ]
    }),
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('chromosome', 'start', 'end', 'table', 'query', 'width', 'sideWidth', 'colourProperty')
  ],

  propTypes: {
    setProps: PropTypes.func,
    chromosome: PropTypes.string,
    start: PropTypes.number,
    end: PropTypes.number,
    width: PropTypes.number,
    sideWidth: PropTypes.number,
    name: PropTypes.string,
    onClose: PropTypes.func,
    table: PropTypes.string.isRequired,
    query: PropTypes.string,
    colourProperty: PropTypes.string,
    onChangeLoadStatus: PropTypes.func,
    hoverPos: PropTypes.number,
    onChangeHoverPos: PropTypes.func
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
      knownValues: null,
      hoverIndex: null,
      hoverClick: null
    };
  },

  componentWillMount() {
    this.positions = [];
    this.tooBigBlocks = [];
  },

  componentWillReceiveProps({hoverPos}) {
    let positions = this.positions;
    for (let i = 0, n = positions.length; i < n; i++) {
      if (positions[i] == hoverPos) {
        this.setState({hoverIndex: i});
        return;
      }
    }
    this.setState({hoverIndex: null});
  },

  componentDidMount() {
    this.draw(this.props);
  },

  componentDidUpdate() {
    this.draw(this.props);
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth, table, query, colourProperty} = props;
    const config = this.config.tablesById[table];
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
      this.getDefinedQuery(this.props.query, this.props.table) !== this.getDefinedQuery(query, table) ||
      this.props.colourProperty !== colourProperty || !(this.blockLevel === blockLevel
      && this.blockIndex === blockIndex
      && this.needNext === needNext)) {
      //Current block was unacceptable so choose best one
      this.blockLevel = blockLevel;
      this.blockIndex = blockIndex;
      this.needNext = needNext;
      this.props.onChangeLoadStatus('LOADING');
      let columns = [config.primKey, config.position];
      if (colourProperty)
        columns.push(colourProperty);
      if (config.previewProperties) {
        columns = columns.concat(config.previewProperties);
      }
      let decodedQuery = SQL.WhereClause.decode(this.getDefinedQuery(query, table));
      decodedQuery = SQL.WhereClause.AND([SQL.WhereClause.CompareFixed(config.chromosome, '=', chromosome), decodedQuery]);
      let APIargs = {
        database: this.config.dataset,
        table,
        columns,
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
  },

  applyData(props, blocks) {
    let {table, colourProperty} = props;
    const config = this.config.tablesById[table];
    this.positions = combineBlocks(blocks, config.position);
    this.primKeys = combineBlocks(blocks, config.primKey);
    this.previewData = {};
    if (config.previewProperties) {
      _forEach(config.previewProperties, (prop) => this.previewData[prop] = combineBlocks(blocks, prop));
    }
    if (colourProperty) {
      this.colourData = combineBlocks(blocks, colourProperty);
      this.colourVals = _map(this.colourData,
        propertyColour(this.config.tablesById[table].propertiesById[colourProperty]));
      this.colourVals = _map(this.colourVals, (colour) => Color(colour).fade(0.1).string());
      this.colourValsTranslucent = _map(this.colourVals, (colour) => Color(colour).fade(0.3).string());
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
    for (let n = -1 * (majorAxis); n < majorAxis; n += delta) {
      ctx.moveTo(n + x1, y1);
      ctx.lineTo(dy + n + x1, y1 + dy);
    }
    ctx.stroke();
    ctx.restore();
  },

  draw(props) {
    const {table, width, sideWidth, start, end, colourProperty} = props;
    const {hoverIndex} = this.state;
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
    //HIGHLIGHT HOVER
    if (hoverIndex !== null) {
      const psx = scaleFactor * (positions[hoverIndex] - start);
      if (psx > -6 && psx < width + 6) {
        ctx.strokeStyle = 'rgb(0, 0, 0)';
        ctx.fillStyle = 'rgb(214, 39, 40)';
        if (colours) {
          if (triangleMode) {
            ctx.fillStyle = colours[hoverIndex];
          } else {
            ctx.strokeStyle = colours[hoverIndex];
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
    this.setState({hoverIndex});
  },

  xyToIndex(x, y) {
    let psy = (HEIGHT / 2) - 6;
    const {width, sideWidth, start, end} = this.props;
    const positions = this.positions;
    const scaleFactor = ((width - sideWidth) / (end - start));
    //Triangles/Lines
    const numPositions = positions.length;
    const triangleMode = numPositions < (width - sideWidth);
    let nearest = 100;
    let nearestClick = 10;
    let nearestIndex = null;
    let nearestClickIndex = null;
    for (let i = 0, l = numPositions; i < l; ++i) {
      const psx = scaleFactor * (positions[i] - start);
      if (Math.abs(x - psx) < nearest) {
        nearest = Math.abs(x - psx);
        nearestIndex = i;
      }
      if (y > psy  && y < psy + 15) {
        if (triangleMode) {
          if (x < psx + 7 && x > psx - 7 && Math.abs(x - psx) < nearestClick) {
            nearestClick = Math.abs(x - psx);
            nearestClickIndex = i;
          }
        } else {
          if (Math.abs(x - psx) < nearestClick) {
            nearestClick = Math.abs(x - psx);
            nearestClickIndex = i;
          }
        }
      }
    }
    return {nearestIndex, nearestClickIndex};
  },

  convertXY(e) {
    let rect = this.refs.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  },

  setHover({nearestIndex, nearestClickIndex}) {
    if (this.props.onChangeHoverPos) {
      this.props.onChangeHoverPos(this.positions[nearestIndex]);
    }
    this.setState({hoverClick: nearestClickIndex});
  },

  handleMouseMove(e) {
    e.persist();
    e.hoverHandled = true;
    let [x, y] = this.convertXY(e);
    let {nearestIndex, nearestClickIndex} = this.xyToIndex(x, y);
    this.setHover({nearestIndex, nearestClickIndex});
  },

  handleMouseOver(e) {
    this.handleMouseMove(e);
  },

  handleMouseOut(e) {
    this.setState({hoverClick: false});
  },

  handleClick(e) {
    if (this.state.hoverClick != null) {
      this.getFlux().actions.panoptes.dataItemPopup({table: this.props.table, primKey: this.primKeys[this.state.hoverClick]});
    }
  },

  render() {
    const {start, end, width, sideWidth, table, colourProperty} = this.props;
    const {knownValues, hoverIndex, hoverClick} = this.state;
    const config = this.config.tablesById[table];
    let hoverId = this.primKeys ? this.primKeys[hoverIndex] : null;
    const scaleFactor = ((width - sideWidth) / (end - start));
    let hoverPx = hoverId ? scaleFactor * (this.positions[hoverIndex] - start) : null;
    const Side = (props) => <div className="side-name">
            <span>
              {this.getDefinedQuery() !== SQL.nullQuery ? <span>Filtered<br/></span> : null}
              {this.config.tablesById[table].capNamePlural}
            </span>
          </div>;
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={HEIGHT}
        sideComponent={<Side/>}
        //Override component update to get latest in case of skipped render
        configComponent={<PerRowIndicatorControls {...this.props} query={this.getDefinedQuery()}
          setProps={this.redirectedProps.setProps}/>}
        legendComponent={colourProperty ?
          <PropertyLegend table={table} property={colourProperty} knownValues={knownValues}/> : null}
        onClose={this.redirectedProps.onClose}
      >
        <div className="canvas-container">
          <Hammer onTap={this.handleClick}>
            <canvas ref="canvas"
              style={{cursor: hoverClick ? 'pointer' : 'inherit'}}
              width={width} height={HEIGHT}
              onMouseOver={this.handleMouseOver}
              onMouseMove={this.handleMouseMove}
              onMouseOut={this.handleMouseOut}
            />
          </Hammer>
          {hoverPx !== null && hoverPx > 0 && hoverPx < width ?
            <Tooltip placement={'right'}
              overlayStyle={{pointerEvents: 'none'}}
              visible={true}
              overlay={<div>
                <div><PropertyCell noLinks prop={config.propertiesById[config.primKey]} value={hoverId}/></div>
                <table><tbody>
                  {_map(config.previewProperties, (prop) =>
                    <tr key={prop}><td style={{paddingRight: '5px'}}>{config.propertiesById[prop].name}:</td><td><PropertyCell noLinks prop={config.propertiesById[prop]} value={this.previewData[prop][hoverIndex]} /></td></tr>)
                  }
                </tbody></table>
              </div>}>
              <div
                style={{pointerEvents: 'none', position: 'absolute', top: `${(HEIGHT / 2) - 6}px`, left: `${hoverPx - 6}px`, height: '12px', width: '12px'}}/>
            </Tooltip>
            : null}</div>

      </ChannelWithConfigDrawer>);
  },
});

const PerRowIndicatorControls = createReactClass({
  displayName: 'PerRowIndicatorControls',

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
    table: PropTypes.string,
    query: PropTypes.string,
    colourProperty: PropTypes.string
  },

  handleQueryPick(query) {
    this.redirectedProps.setProps({query});
  },

  getDefinedQuery() {
    return (this.props.query) ||
      ((this.props.table) ? this.config.tablesById[this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  render() {
    let {table, colourProperty, query} = this.props;
    return (
      <div className="channel-controls">
        <div className="control">
          <QueryString prepend="Filter:" table={table} query={this.getDefinedQuery()}/>
        </div>
        <div className="control">
          <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
        </div>
        <div className="control">
          <div className="label">Colour By:</div>
          <PropertySelector
            table={table}
            value={colourProperty}
            onSelect={(colourProperty) => this.redirectedProps.setProps({colourProperty})}
          />
        </div>
      </div>
    );
  },
});

export default PerRowIndicatorChannel;
