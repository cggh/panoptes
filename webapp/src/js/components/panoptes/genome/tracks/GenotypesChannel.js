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
import {findBlock, regionCacheGet} from 'util/PropertyRegionCache';
import ErrorReport from 'panoptes/ErrorReporter';
import PropertySelector from 'panoptes/PropertySelector';
import PropertyLegend from 'panoptes/PropertyLegend';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import {hatchRect} from 'util/CanvasDrawing';
import FilterButton from 'panoptes/FilterButton';

import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import FlatButton from 'material-ui/FlatButton';

import 'hidpi-canvas';
import {propertyColour, categoryColours} from 'util/Colours';

const HEIGHT = 50;

let GenotypesChannel = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'componentUpdate',
        'onClose'
      ],
      check: [
        'chromosome',
        'width',
        'sideWidth',
        'name',
        'table',
        'columnQuery',
        'rowQuery',
        'rowLabel'
      ]
    }),
    ConfigMixin,
    FluxMixin,
    DataFetcherMixin('chromosome',
      'start',
      'end',
      'width',
      'sideWidth',
      'table',
      'columnQuery',
      'rowQuery',
      'rowLabel'
    )
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    name: React.PropTypes.string,
    onClose: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
    columnQuery: React.PropTypes.string,
    rowQuery: React.PropTypes.string,
    rowLabel: React.PropTypes.string,
    onChangeLoadStatus: React.PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {
      rowQuery: SQL.nullQuery,
      columnQuery: SQL.nullQuery,
    };
  },

  getInitialState() {
    return {};
  },

  componentWillMount() {
    this.positions = [];
    this.tooBigBlocks = [];
    this.blocks = [];
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth, table, columnQuery, rowQuery, rowLabel} = props;
    let config = this.config.twoDTablesById[table];
    console.log(this.config);
    console.log(config);
    if (this.props.chromosome !== chromosome) {
      this.applyData(props, {});
    }
    if (width - sideWidth < 1) {
      return;
    }
    if (rowLabel && !this.config.tables[config.rowDataTable].propertiesById[rowLabel]) {
      ErrorReport(this.getFlux(), `Genotypes ${table} channel: ${rowLabel} is not a valid property of ${config.rowDataTable}`);
      return;
    }
    const {blockLevel, blockIndex, needNext} = findBlock({start, end});
    //If we already at this block then don't change it!
    if (this.props.chromosome !== chromosome ||
      this.props.rowQuery !== rowQuery ||
      this.props.columnQuery !== columnQuery ||
      this.props.rowLabel !== rowLabel ||
      !(this.blockLevel === blockLevel
      && this.blockIndex === blockIndex
      && this.needNext === needNext)) {
      //Current block was unacceptable so choose best one
      this.blockLevel = blockLevel;
      this.blockIndex = blockIndex;
      this.needNext = needNext;
      this.props.onChangeLoadStatus('LOADING');
      let columnTableConfig = this.config.tablesById[config.columnDataTable];
      let rowTableConfig = this.config.tablesById[config.rowDataTable];
      let rowProperties = [rowTableConfig.primKey];
      if (rowLabel)
        rowProperties.push(rowLabel);
      columnQuery = SQL.WhereClause.decode(columnQuery);
      columnQuery = SQL.WhereClause.AND([SQL.WhereClause.CompareFixed(columnTableConfig.chromosome, '=', chromosome),
        columnQuery]);
      let APIargs = {
        database: this.config.dataset,
        workspace: initialConfig.workspace,
        datatable: table,
        col_qry: SQL.WhereClause.encode(columnQuery),
        col_order: columnTableConfig.position,
        row_qry: rowQuery,
        row_order: 'NULL',
        col_properties: columnTableConfig.primKey,
        row_properties: rowProperties.join('~'),
        '2D_properties': 'genotype',
        first_dimersion: config.firstArrayDimension,
        col_only_on_limit: true
      };
      let cacheArgs = {
        method: 'twoDPageQuery',
        regionField: columnTableConfig.position,
        queryField: 'col_qry',
        limitField: 'col_fail_limit',
        start,
        end,
        blockLimit: 1000,
        isBlockTooBig: (block) => block._over_col_limit
      };
      requestContext.request((componentCancellation) =>
        regionCacheGet(APIargs, cacheArgs, componentCancellation)
          .then((blocks) => {
            this.props.onChangeLoadStatus('DONE');
            this.applyData(props, blocks);
          }))
        .catch((err) => {
          this.props.onChangeLoadStatus('DONE');
          throw err;
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((error) => {
          this.applyData(props, {});
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props, requestContext));
          throw error;
        });
    }
  },

  combineBlocks(blocks, property) {
    return _transform(blocks, (sum, block) =>
        Array.prototype.push.apply(sum, block[property] || []),
      []);
  },

  applyData(props, blocks) {
    console.log(blocks);
    this.setState({blocks});
    // let {table, colourProperty} = props;
    // let tableConfig = this.config.tables[table];
    // this.blocks = blocks;
    // this.positions = this.combineBlocks(blocks, tableConfig.position);
    // if (colourProperty) {
    //   this.colourData = this.combineBlocks(blocks, colourProperty);
    //   this.colourVals = _map(this.colourData,
    //     propertyColour(this.config.tables[table].propertiesMap[colourProperty]));
    //   this.colourVals = _map(this.colourVals, (colour) => Color(colour).clearer(0.2).rgbString());
    //   this.colourValsTranslucent = _map(this.colourVals, (colour) => Color(colour).clearer(0.4).rgbString());
    // } else {
    //   this.colourVals = null;
    //   this.colourData = null;
    // }
    // //Filter out big blocks and merge neighbouring ones.
    // this.tooBigBlocks = _transform(_filter(blocks, {_tooBig: true}), (merged, block) => {
    //   const lastBlock = merged[merged.length-1];
    //   //if (lastBlock) console.log(lastBlock._blockStart + lastBlock._blockSize, block._blockStart);
    //   if (lastBlock && lastBlock._blockStart + lastBlock._blockSize === block._blockStart) {
    //     //Copy to avoid mutating the cache
    //     merged[merged.length-1] = {...lastBlock, _blockSize:lastBlock._blockSize + block._blockSize};
    //   } else {
    //     merged.push(block);
    //   }
    // });
    // this.draw(props);
  },


  render() {
    let {width, sideWidth, table} = this.props;
    const {blocks} = this.state;
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={HEIGHT}
        sideComponent={
          <div className="side-name">
            <span>{name || this.config.twoDTablesById[table].nameSingle}</span>
            </div>
            }
        //Override component update to get latest in case of skipped render
        configComponent={<GenotypesControls {...this.props} componentUpdate={this.redirectedProps.componentUpdate} />}
        legendComponent={<div>LEDGE</div>}
        onClose={this.redirectedProps.onClose}
      >
        <div>{`${blocks ? blocks.length : '0'} blocks`}</div>
      </ChannelWithConfigDrawer>);
  }
});

const GenotypesControls = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'rowLabel'
      ],
      redirect: ['componentUpdate']
    }),
    FluxMixin,
    ConfigMixin
  ],

  render() {
    let {table, columnQuery, rowLabel} = this.props;
    return (
      <div className="channel-controls">
        <div className="control">
          <FilterButton table={this.config.twoDTablesById[table].columnDataTable} query={columnQuery} onPick={(columnQuery) => this.redirectedProps.componentUpdate({columnQuery})}/>
        </div>
        <div className="control">
          <div className="label">Row Label:</div>
          <PropertySelector table={this.config.twoDTablesById[table].rowDataTable}
                            value={rowLabel}
                            onSelect={(rowLabel) => this.redirectedProps.componentUpdate({rowLabel})} />
        </div>
      </div>
    );
  }

});

module.exports = GenotypesChannel;


