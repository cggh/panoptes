import React from 'react';

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import _filter from 'lodash/filter';
import _sumBy from 'lodash/sumBy';
import _each from 'lodash/each';
import _sortedIndex from 'lodash/sortedIndex';
import _sortedLastIndex from 'lodash/sortedLastIndex';
import _sortBy from 'lodash/sortBy';
import _last from 'lodash/last';
import _takeRight from 'lodash/takeRight';
import _unique from 'lodash/uniq';

import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import Checkbox from 'material-ui/Checkbox';

import SQL from 'panoptes/SQL';
import {findBlock, regionCacheGet} from 'util/PropertyRegionCache';
import ErrorReport from 'panoptes/ErrorReporter';
import PropertySelector from 'panoptes/PropertySelector';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import {hatchRect} from 'util/CanvasDrawing';
import FilterButton from 'panoptes/FilterButton';
import GenotypesFan from 'panoptes/genome/tracks/GenotypesFan';
import GenotypesTable from 'panoptes/genome/tracks/GenotypesTable';
import GenotypesRowHeader from 'panoptes/genome/tracks/GenotypesRowHeader';
import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';

import 'hidpi-canvas';
import {propertyColour, categoryColours} from 'util/Colours';

const FAN_HEIGHT = 60;

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
        'rowSort',
        'layoutGaps',
        'cellColour',
        'cellAlpha',
        'cellHeight',
        'rowHeight',
        'pageSize',
        'page'
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
      'rowLabel',
      'rowSort',
      'cellColour',
      'cellAlpha',
      'cellHeight',
      'layoutGaps',
      'rowHeight',
      'pageSize',
      'page'
    ),
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
    rowSort: React.PropTypes.string,
    rowHeight: React.PropTypes.number,
    pageSize: React.PropTypes.number,
    page: React.PropTypes.number,
    layoutGaps: React.PropTypes.bool,
    onChangeLoadStatus: React.PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {
      rowQuery: SQL.nullQuery,
      columnQuery: SQL.nullQuery,
      layoutGaps: true,
      rowHeight: 10,
      pageSize: 100,
      page: 0,
      cellColour: 'call',
      rowSort: 'NULL'
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

  layoutColumns(props, genomicPositions) {
    const {start, end, layoutGaps} = props;
    const startIndex = _sortedIndex(genomicPositions, start);
    const endIndex = _sortedLastIndex(genomicPositions, end);
    const visibleGenomicPositions = genomicPositions.subarray(startIndex, endIndex);

    const maxGapCount = layoutGaps ? 20 : 0;

    //Get an array of all the gaps
    let gaps = []; //Pair of (index, gap before)
    gaps.push([0, visibleGenomicPositions[0] - start]);
    for (let i = 1, iEnd = visibleGenomicPositions.length; i < iEnd; ++i) {
      gaps.push([i, visibleGenomicPositions[i] - visibleGenomicPositions[i - 1]]);
    }
    gaps.push([visibleGenomicPositions.length, end - _last(visibleGenomicPositions)]);

    //Filter to only those gaps more than three times the mean gap size
    gaps = _filter(gaps, (gap) => gap[1] > 3 * ((end - start) / gaps.length));

    //We then only take the biggest ones
    gaps = _takeRight(_sortBy(gaps, (gap) => gap[1]), maxGapCount);

    //Sum their sizes so we know how much total space to give to them
    const gapSum = _sumBy(gaps, (gap) => gap[1]) / 2;
    //Calculate how many blank columns that is
    const spacingColumns = Math.floor((gapSum / ((end - start - gapSum) / visibleGenomicPositions.length)));
    const colWidth = (end - start) / (visibleGenomicPositions.length + spacingColumns);

    //Then allocate to the biggest one - subtracting the gap from it and allocating again.
    const gapSizes = new Uint32Array(visibleGenomicPositions.length + 1); //+1 to include gap between last pos and end
    for (let i = 0; i < spacingColumns; ++i) {
      const gap = _last(gaps); //Find the buggest gap
      gapSizes[gap[0]] += 1;   //And a skipped column to it
      gap[1] -= colWidth;      //Subtract the skipped column width so we don't always allocate to this gap
      gaps = _sortBy(gaps, (gap) => gap[1]); //Resort to find newest biggest
    }
    //We now have the number of blank columns before each column - translate this to a set of blocks.
    const layoutBlocks = [];
    let currentStart = 0; //Pos index
    let colStart = gapSizes[0];     //Actual starting column of this block, first value is number of skipped columns from start
    for (let i = 0, iend = gapSizes.length - 1; i < iend; ++i) {
      if (gapSizes[i + 1] > 0 || i === gapSizes.length - 2) {
        layoutBlocks.push([currentStart + startIndex, i + 1 + startIndex, colStart]);  //[blockStart, blockEnd, colStart]
        colStart = colStart + (i - currentStart + 1) + gapSizes[i + 1];
        currentStart = i + 1;
      }
    }
    return {colWidth, layoutBlocks};
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth, table, columnQuery, rowQuery, rowLabel, cellColour, cellAlpha, cellHeight, page, pageSize, rowSort} = props;
    let config = this.config.twoDTablesById[table];
    // console.log(this.config);
    // console.log(config);
    const dataInvlidatingProps = ['chromosome', 'cellColour', 'cellAlpha', 'cellHeight',  'rowQuery', 'columnQuery', 'rowLabel', 'rowSort', 'layoutGaps'];
    if (dataInvlidatingProps.some((name) => this.props[name] !== props[name])) {
      this.applyData(props, {});
    }
    if (width - sideWidth < 1) {
      return;
    }
    if (rowLabel && !this.config.tablesById[config.rowDataTable].propertiesById[rowLabel]) {
      ErrorReport(this.getFlux(), `Genotypes ${table} channel: ${rowLabel} is not a valid property of ${config.rowDataTable}`);
      return;
    }
    if (rowSort && !this.config.tablesById[config.rowDataTable].propertiesById[rowSort] && rowSort != 'NULL') {
      ErrorReport(this.getFlux(), `Genotypes ${table} channel: ${rowSort} is not a valid property of ${config.rowDataTable}`);
      return;
    }
    if (cellColour !== 'call' && cellColour !== 'fraction') {
      ErrorReport(this.getFlux(), `Genotypes ${table} channel: cellColour must be call or fraction`);
      return;
    }
    if (cellAlpha && !config.propertiesById[cellAlpha]) {
      ErrorReport(this.getFlux(), `Genotypes ${table} channel: ${cellAlpha} is not a valid property of ${config.id}`);
      return;
    }
    if (cellHeight && !config.propertiesById[cellHeight]) {
      ErrorReport(this.getFlux(), `Genotypes ${table} channel: ${cellHeight} is not a valid property of ${config.id}`);
      return;
    }
    const {blockLevel, blockIndex, needNext} = findBlock({start, end});
    //If we already at this block then don't change it!
    if (dataInvlidatingProps.some((name) => this.props[name] !== props[name]) || !(this.blockLevel === blockLevel
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
      let twoDProperties = cellColour === 'call' ? [config.showInGenomeBrowser.call] : [config.showInGenomeBrowser.alleleDepth];
      if (cellAlpha) {
        twoDProperties.push(cellAlpha);
      }
      if (cellHeight) {
        twoDProperties.push(cellHeight);
      }
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
        row_order: rowSort,
        row_offset: page * pageSize,
        row_limit: (page + 1) * pageSize,
        col_properties: colProperties.join('~'),
        row_properties: rowProperties.join('~'),
        '2D_properties': twoDProperties.join('~'),
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
          let fraction = alt_count / (ref_count + alt_count);
          fraction = Math.max(0, fraction);
          fraction = Math.min(1, fraction);
          fractional_matrix[row * lcols + col] = alt_count + ref_count > 0 ? 1 + 255 * fraction : 0;
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
    const {table, rowLabel} = props;
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
        label: dataBlocks[0][`row_${rowLabel}`] || dataBlocks[0][`row_${rowTableConfig.primKey}`] //Fallback to primkey if no label was set
      } : null,
      dataBlocks,
      genomicPositions,
      ...this.layoutColumns(props, genomicPositions)
    });
  },


  render() {
    let {width, sideWidth, table, start, end, rowHeight, rowLabel, cellColour, cellAlpha, cellHeight, pageSize} = this.props;
    const {rowData, dataBlocks, layoutBlocks, genomicPositions, colWidth} = this.state;
    const config = this.config.twoDTablesById[table];
    const rowConfig = this.config.tablesById[config.rowDataTable];

    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={(rowHeight * pageSize) + FAN_HEIGHT}
        sideComponent={<GenotypesRowHeader
          table={table}
          width={sideWidth}
          tableHeight={rowHeight * pageSize}
          rowData={rowData}
          rowHeight={rowHeight}
          rowLabel={rowLabel || rowConfig.primKey}
        />}
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
          table={table}
          rowData={rowData}
          dataBlocks={dataBlocks}
          layoutBlocks={layoutBlocks}
          width={width - sideWidth}
          height={rowHeight * pageSize}
          start={start}
          end={end}
          colWidth={colWidth}
          cellColour={cellColour}
          cellAlpha={cellAlpha}
          cellHeight={cellHeight}
          rowHeight={rowHeight}
        />
      </ChannelWithConfigDrawer>);
  }
});

const GenotypesControls = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      check: [
        'rowLabel',
        'columnQuery',
        'rowQuery',
        'cellColour',
        'cellAlpha',
        'cellHeight',
        'layoutGaps',
        'rowSort'
      ],
      redirect: ['componentUpdate']
    }),
    FluxMixin,
    ConfigMixin
  ],

  render() {
    let {table, columnQuery, rowQuery, rowLabel, cellColour, cellAlpha, cellHeight, layoutGaps, rowSort} = this.props;
    const config = this.config.twoDTablesById[table];
    return (
      <div className="channel-controls">
        <div className="control">
          <FilterButton table={config.columnDataTable} query={columnQuery}
                        name={this.config.tablesById[config.columnDataTable].capNamePlural}
                        onPick={(columnQuery) => this.redirectedProps.componentUpdate({columnQuery})}/>
        </div>
        <div className="control">
          <FilterButton table={config.rowDataTable} query={rowQuery}
                        name={this.config.tablesById[config.rowDataTable].capNamePlural}
                        onPick={(rowQuery) => this.redirectedProps.componentUpdate({rowQuery})}/>
        </div>
        <div className="control">
          <PropertySelector table={config.rowDataTable}
                            value={rowLabel || this.config.tablesById[config.rowDataTable].primKey}
                            label="Row Label"
                            onSelect={(rowLabel) => this.redirectedProps.componentUpdate({rowLabel})}/>
        </div>
        <div className="control">
          <PropertySelector table={config.rowDataTable}
                            value={rowSort}
                            label="Row Sort"
                            allowNull={true}
                            onSelect={(rowSort) => this.redirectedProps.componentUpdate({rowSort})}/>
        </div>
        <div className="control">
          <SelectField style={{width: '140px'}}
                       value={cellColour}
                       autoWidth={true}
                       floatingLabelText="Cell Colour"
                       onChange={(e, i, cellColour) => this.redirectedProps.componentUpdate({cellColour})}>
            <MenuItem value="call" primaryText="Call"/>
            <MenuItem value="fraction" primaryText="Ref fraction"/>
          </SelectField>
        </div>
        <div className="control">
          <SelectField style={{width: '256px'}}
                       value={cellAlpha}
                       autoWidth={true}
                       floatingLabelText="Cell Opacity"
                       onChange={(e, i, cellAlpha) => this.redirectedProps.componentUpdate({cellAlpha: cellAlpha === 'none' ? undefined : cellAlpha})}>
            <MenuItem value='none' primaryText="None"/>
            {config.showInGenomeBrowser.extraProperties.map((prop) => <MenuItem value={prop} key={prop} primaryText={config.propertiesById[prop].name}/>)}
          </SelectField>
        </div>
        <div className="control">
          <SelectField style={{width: '256px'}}
                       value={cellHeight}
                       autoWidth={true}
                       floatingLabelText="Cell Height"
                       onChange={(e, i, cellHeight) => this.redirectedProps.componentUpdate({cellHeight: cellHeight === 'none' ? undefined : cellHeight})}>
            <MenuItem value='none' primaryText="None"/>
            {config.showInGenomeBrowser.extraProperties.map((prop) => <MenuItem value={prop} key={prop} primaryText={config.propertiesById[prop].name}/>)}
          </SelectField>
        </div>
        <div className="control">
          <div className="label">Space columns:</div>
          <Checkbox
            name="layoutGaps"
            defaultChecked={layoutGaps}
            style={{width: 'inherit'}}
            onCheck={(e, checked) => this.redirectedProps.componentUpdate({layoutGaps: checked})}/>
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


