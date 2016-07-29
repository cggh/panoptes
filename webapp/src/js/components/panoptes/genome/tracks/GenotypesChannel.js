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
import _sumBy from 'lodash/sumBy';
import _each from 'lodash/each';
import _sortedIndex from 'lodash/sortedIndex';
import _sortedLastIndex from 'lodash/sortedLastIndex';

import SQL from 'panoptes/SQL';
import {findBlock, regionCacheGet} from 'util/PropertyRegionCache';
import ErrorReport from 'panoptes/ErrorReporter';
import PropertySelector from 'panoptes/PropertySelector';
import PropertyLegend from 'panoptes/PropertyLegend';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import {hatchRect} from 'util/CanvasDrawing';
import FilterButton from 'panoptes/FilterButton';
import GenotypesFan from 'panoptes/genome/tracks/GenotypesFan';
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
        'rowLabel',
        'layoutMode',
        'manualWidth'
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
    layoutMode: React.PropTypes.string,
    manualWidth: React.PropTypes.number,
    onChangeLoadStatus: React.PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {
      rowQuery: SQL.nullQuery,
      columnQuery: SQL.nullQuery,
      layoutMode: 'auto'
    };
  },

  getInitialState() {
    return {
      blocks: [],
      colPositions: new Float64Array(0),
      genomicPositions: new Float64Array(0),
      visibleGenomicPositions: new Float64Array(0),
      colWidth: 1
    };
  },

  componentWillMount() {
  },

  componentWillUpdate(props, {blocks}) {
  },

  layoutColumns(props, genomicPositions) {
    const {start, end, layoutMode, manualWidth} = props;
    const visibleGenomicPositions = genomicPositions.subarray(_sortedIndex(genomicPositions, start), _sortedLastIndex(genomicPositions, end));
    let colPositions = new Float64Array(visibleGenomicPositions);
    let colWidth = 1;
    if (layoutMode == 'manual')
      colWidth = manualWidth;
    if (layoutMode == 'auto') {
      if (visibleGenomicPositions.length > 0)
        colWidth = Math.max(3, (0.70 * ((end - start) / visibleGenomicPositions.length)));
    }

    if (layoutMode == 'auto' || layoutMode == 'manual') {
      let mid_index = Math.floor(colPositions.length / 2);
      let psxlast;
      for (var cf = 0.1; cf <= 1; cf += 0.1) {
        //Sweep middle out
        psxlast = colPositions[mid_index];
        for (var i = mid_index + 1, ref = colPositions.length; i < ref; i++) {
          if (colPositions[i] < psxlast + cf * colWidth)
            colPositions[i] = psxlast + cf * colWidth;
          psxlast = colPositions[i];
        }
        psxlast = colPositions[mid_index];
        for (i = mid_index - 1; i >= 0; i--) {
          if (colPositions[i] > psxlast - cf * colWidth)
            colPositions[i] = psxlast - cf * colWidth;
          psxlast = colPositions[i];
        }
        cf += 0.1;
        //Sweep edges in
        psxlast = -Infinity;
        for (i = 0, ref = mid_index; i < ref; i++) {
          if (colPositions[i] < psxlast + cf * colWidth)
            colPositions[i] = psxlast + cf * colWidth;
          psxlast = colPositions[i];
        }
        psxlast = Infinity;
        for (i = colPositions.length - 1; i >= mid_index; i--) {
          if (colPositions[i] > psxlast - cf * colWidth)
            colPositions[i] = psxlast - cf * colWidth;
          psxlast = colPositions[i];
        }
      }

      psxlast = -Infinity;
      for (i = 0, ref = colPositions.length; i < colPositions.length; i++) {
        if (colPositions[i] < psxlast + colWidth)
          colPositions[i] = psxlast + colWidth;
        psxlast = colPositions[i];
      }
      return {colWidth, colPositions, visibleGenomicPositions};
    }

    if (layoutMode == 'fill') {
      colWidth = (end - start) / visibleGenomicPositions.length;
      for (i = 0, ref = colPositions.length; i < colPositions.length; i++) {
        colPositions[i] = start + (i * colWidth) + colWidth / 2;
      }
      return {colWidth, colPositions, visibleGenomicPositions};
    }

  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth, table, columnQuery, rowQuery, rowLabel} = props;
    let config = this.config.twoDTablesById[table];
    // console.log(this.config);
    // console.log(config);
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
      this.props.rowLabel !== rowLabel || !(this.blockLevel === blockLevel
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
      let colProperties = [columnTableConfig.primKey, columnTableConfig.position];
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
        col_properties: colProperties.join('~'),
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
            this.applyData(this.props, blocks);
          }))
        .catch((err) => {
          this.props.onChangeLoadStatus('DONE');
          throw err;
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((error) => {
          this.applyData(this.props, {});
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(this.props, requestContext));
          throw error;
        });
    }
  },

  componentWillReceiveProps(nextProps) {
    const toCheck = ['start', 'end', 'layoutMode'];
    if (toCheck.some((name) => this.props[name] !== nextProps[name]) &&
      this.state.genomicPositions
    ) {
      this.setState(this.layoutColumns(nextProps, this.state.genomicPositions));
    }
  },

  applyData(props, blocks) {
    const {table, start, end} = props;
    const config = this.config.twoDTablesById[table];
    const columnTableConfig = this.config.tablesById[config.columnDataTable];
    //Concatenate all the positions for quick reference
    let genomicPositions = new Float64Array(
      _sumBy(_filter(blocks, (block) => !block._tooBig),
        (block) => block[`col_${columnTableConfig.position}`].array.length));
    let arrayPos = 0;
    _each(blocks, (block) => {
      if (!block._tooBig) {
        let data = block[`col_${columnTableConfig.position}`].array;
        genomicPositions.set(data, arrayPos);
        arrayPos += data.length;
      }
    });
    this.setState({
      blocks,
      genomicPositions,
      ...this.layoutColumns(props, genomicPositions)
    });
  },


  render() {
    let {width, sideWidth, table, start, end} = this.props;
    const {blocks, genomicPositions, visibleGenomicPositions, colPositions, colWidth} = this.state;
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
        configComponent={<GenotypesControls {...this.props} componentUpdate={this.redirectedProps.componentUpdate}/>}
        legendComponent={<div>LEDGE</div>}
        onClose={this.redirectedProps.onClose}
      >
        <GenotypesFan
          genomicPositions={visibleGenomicPositions}
          colPositions={colPositions}
          width={width - sideWidth}
          height={HEIGHT}
          start={start}
          end={end}
          colWidth={colWidth}/>
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
          <FilterButton table={this.config.twoDTablesById[table].columnDataTable} query={columnQuery}
                        onPick={(columnQuery) => this.redirectedProps.componentUpdate({columnQuery})}/>
        </div>
        <div className="control">
          <div className="label">Row Label:</div>
          <PropertySelector table={this.config.twoDTablesById[table].rowDataTable}
                            value={rowLabel}
                            onSelect={(rowLabel) => this.redirectedProps.componentUpdate({rowLabel})}/>
        </div>
      </div>
    );
  }

});

module.exports = GenotypesChannel;


