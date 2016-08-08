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
import _sortBy from 'lodash/sortBy';
import _last from 'lodash/last';
import _takeRight from 'lodash/takeRight';
import _unique from 'lodash/uniq';

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
import GenotypesTable from 'panoptes/genome/tracks/GenotypesTable';
import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import FlatButton from 'material-ui/FlatButton';

import 'hidpi-canvas';
import {propertyColour, categoryColours} from 'util/Colours';

const FAN_HEIGHT = 60;
const TABLE_HEIGHT = 500;
const HEIGHT = 560;

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
    const {start, end, layoutMode} = props;
    const startIndex = _sortedIndex(genomicPositions, start);
    const endIndex = _sortedLastIndex(genomicPositions, end);
    const visibleGenomicPositions = genomicPositions.subarray(startIndex, endIndex);

    const maxGapCount = layoutMode === 'auto' ? 20 : 0 ;

    //Get an array of all the gaps
    let gaps = []; //Pair of (index, gap before)
    gaps.push([0, visibleGenomicPositions[0] - start]);
    for (let i = 1, iend = visibleGenomicPositions.length;i < iend; ++i) {
      gaps.push([i, visibleGenomicPositions[i] - visibleGenomicPositions[i-1]]);
    }
    gaps.push([visibleGenomicPositions.length, end - _last(visibleGenomicPositions)]);

    //Filter to only those gaps more than three times the mean gap size
    gaps = _filter(gaps, (gap) => gap[1] > 3*((end - start)/gaps.length));

    //We then only take the biggest ones
    gaps = _takeRight(_sortBy(gaps, (gap) => gap[1]), maxGapCount);

    //Sum their sizes so we know how much total space to give to them
    const gapSum = _sumBy(gaps, (gap) => gap[1])/2;
    //Calculate how many blank columns that is
    const spacingColumns = Math.floor((gapSum / ((end - start - gapSum) / visibleGenomicPositions.length)));
    const colWidth = (end - start) / (visibleGenomicPositions.length + spacingColumns);

    //Then allocate to the biggest one - subtracting the gap from it and allocating again.
    const gapSizes = new Uint32Array(visibleGenomicPositions.length + 1); //+1 to include gap between last pos and end
    for(let i = 0;i < spacingColumns; ++i) {
      const gap = _last(gaps); //Find the buggest gap
      gapSizes[gap[0]] += 1;   //And a skipped column to it
      gap[1] -= colWidth;      //Subtract the skipped column width so we don't always allocate to this gap
      gaps = _sortBy(gaps, (gap) => gap[1]); //Resort to find newest biggest
    }
    //We now have the number of blank columns before each column - translate this to a set of blocks.
    const layoutBlocks = [];
    let currentStart = 0; //Pos index
    let colStart = gapSizes[0];     //Actual starting column of this block, first value is number of skipped columns from start
    for (let i = 0, iend = gapSizes.length - 1;i < iend; ++i) {
      if (gapSizes[i+1] > 0 || i === gapSizes.length - 2) {
        layoutBlocks.push([currentStart + startIndex, i + 1 + startIndex, colStart]);  //[blockStart, blockEnd, colStart]
        colStart = colStart + (i - currentStart + 1) + gapSizes[i+1];
        currentStart = i+1;
      }
    }
    return {colWidth, layoutBlocks};
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
      rowProperties = _unique(rowProperties);
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
        first_dimension: config.firstArrayDimension,
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
        isBlockTooBig: (block) => block._over_col_limit,
        postProcessBlock: this.calculatedDerivedProperties,
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

  calculatedDerivedProperties(block) {
    let config = this.config.twoDTablesById[this.props.table].showInGenomeBrowser;
    if (config.call && block['2D_' + config.call]) {
      let call_matrix = block['2D_' + config.call];
      let call_matrix_array = call_matrix.array;
      let ploidy = call_matrix.shape[2] || 1;
      let call_summary_matrix = new Int8Array(call_matrix_array.length / ploidy);
      for (let row = 0, lrows = call_matrix.shape[0]; row < lrows; row++) {
        for (let col = 0, lcols = call_matrix.shape[1]; col < lcols; col++) {
          let call = -2; //init
          for (let allele = 0; allele < ploidy; allele++) {
            let c = call_matrix_array[row * lcols * ploidy + col * ploidy + allele];

            c = c > 0 ? 1 : c;
            if (c == -1) { //Missing
              call = -1;
              break;
            }
            if (c == 0 && call == 1) { //REF BUT WAS PREVIOUSLY ALT
              call = 2; //HET
              break;
            }
            if (c == 1 && call == 0) { //ALT BUT WAS PREVIOUSLY REF
              call = 2; //HET
              break;
            }
            call = c;
          }
          call_summary_matrix[row * lcols + col] = call;
        }
      }
      call_summary_matrix = {
        array: call_summary_matrix,
        shape: [call_matrix.shape[0], call_matrix.shape[1]]
      };
      block['2D__call'] = call_summary_matrix;
    }
    if (config.alleleDepth && block['2D_' + config.alleleDepth]) {
      let depth_matrix = block['2D_' + config.alleleDepth];
      let depth_matrix_array = depth_matrix.array;
      let arity = depth_matrix.shape[2] || 1;
      let fractional_matrix = new Uint8ClampedArray(depth_matrix_array.length / arity);
      for (let row = 0, lrows = depth_matrix.shape[0]; row < lrows; row++) {
        for (let col = 0, lcols = depth_matrix.shape[1]; col < lcols; col++) {
          let ref_count = depth_matrix_array[row * lcols * arity + col * arity];
          let alt_count = 0;
          for (let allele = 1; allele < arity; allele++) {
            alt_count += depth_matrix_array[row * lcols * arity + col * arity + allele];
          }
          let fraction = alt_count/(ref_count+alt_count);
          fraction = Math.max(0,fraction);
          fraction = Math.min(1,fraction);
          fractional_matrix[row * lcols + col] = alt_count+ref_count > 0 ? 1 + 255 * fraction : 0;
        }
      }
      fractional_matrix = {
        array: fractional_matrix,
        shape: [depth_matrix.shape[0], depth_matrix.shape[1]]
      };
      block['2D__fraction'] = fractional_matrix;
    }
    return block;
  },

  componentWillReceiveProps(nextProps) {
    const toCheck = ['start', 'end', 'layoutMode'];
    if (toCheck.some((name) => this.props[name] !== nextProps[name]) &&
      this.state.genomicPositions
    ) {
      this.setState(this.layoutColumns(nextProps, this.state.genomicPositions));
    }
  },

  applyData(props, dataBlocks) {
    const {table, start, end, rowLabel} = props;
    const config = this.config.twoDTablesById[table];
    const columnTableConfig = this.config.tablesById[config.columnDataTable];
    const rowTableConfig = this.config.tablesById[config.rowDataTable];
    //Concatenate all the positions for quick reference
    let genomicPositions = new Float64Array(
      _sumBy(_filter(dataBlocks, (block) => !block._tooBig),
        (block) => block[`col_${columnTableConfig.position}`].array.length));
    let arrayPos = 0;
    _each(dataBlocks, (block) => {
      if (!block._tooBig) {
        let data = block[`col_${columnTableConfig.position}`].array;
        genomicPositions.set(data, arrayPos);
        arrayPos += data.length;
      }
    });
    this.setState({
      rowData: dataBlocks.length > 0 ? {
        id: dataBlocks[0][`row_${rowTableConfig.primKey}`],
        label: dataBlocks[0][`row_${rowLabel}`]
      } : null,
      dataBlocks,
      genomicPositions,
      ...this.layoutColumns(props, genomicPositions)
    });
  },


  render() {
    let {width, sideWidth, table, start, end} = this.props;
    const {rowData, dataBlocks, layoutBlocks, genomicPositions, colWidth} = this.state;
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
        legendComponent={<GenotypesLegend />}
        onClose={this.redirectedProps.onClose}
      >
        <GenotypesFan
          genomicPositions={genomicPositions}
          layoutBlocks={layoutBlocks}
          width={width - sideWidth}
          height={FAN_HEIGHT}
          start={start}
          end={end}
          colWidth={colWidth}/>
        <GenotypesTable
          rowData={rowData}
          dataBlocks={dataBlocks}
          layoutBlocks={layoutBlocks}
          width={width - sideWidth}
          height={TABLE_HEIGHT}
          start={start}
          end={end}
          colWidth={colWidth}
          cellColour="call"
          rowHeight={1}
        />
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

const GenotypesLegend = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'rowLabel'
      ],
    }),

  ],

  render() {

    return (
      <div>Legend</div>
    );
  }

});

module.exports = GenotypesChannel;


