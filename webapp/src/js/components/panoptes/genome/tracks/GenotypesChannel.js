import React from 'react';

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import _filter from 'lodash/filter';
import _sumBy from 'lodash/sumBy';
import _sortedIndex from 'lodash/sortedIndex';
import _sortedLastIndex from 'lodash/sortedLastIndex';
import _sortBy from 'lodash/sortBy';
import _last from 'lodash/last';
import _takeRight from 'lodash/takeRight';
import _unique from 'lodash/uniq';

import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import Checkbox from 'material-ui/Checkbox';
import FlatButton from 'material-ui/FlatButton';

import SQL from 'panoptes/SQL';
import {findBlock, regionCacheGet, combineBlocks} from 'util/PropertyRegionCache';
import ErrorReport from 'panoptes/ErrorReporter';
import PropertySelector from 'panoptes/PropertySelector';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import FilterButton from 'panoptes/FilterButton';
import GenotypesFan from 'panoptes/genome/tracks/GenotypesFan';
import GenotypesTable from 'panoptes/genome/tracks/GenotypesTable';
import GenotypesRowHeader from 'panoptes/genome/tracks/GenotypesRowHeader';
import ChannelWithConfigDrawer from 'panoptes/genome/tracks/ChannelWithConfigDrawer';
import NumericInput from 'ui/NumericInput';
import DataDownloader from 'util/DataDownloader';
import Icon from 'ui/Icon';
import QueryConverter from 'util/QueryConverter';

const FAN_HEIGHT = 60;

let GenotypesChannel = React.createClass({
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
    setProps: React.PropTypes.func,
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    width: React.PropTypes.number,
    sideWidth: React.PropTypes.number,
    name: React.PropTypes.string,
    onClose: React.PropTypes.func,
    table: React.PropTypes.string.isRequired,
    columnQuery: React.PropTypes.string,
    rowQuery: React.PropTypes.string,
    rowLabel: React.PropTypes.string,
    rowSort: React.PropTypes.string,
    rowHeight: React.PropTypes.number,
    cellColour: React.PropTypes.string,
    cellAlpha: React.PropTypes.string,
    cellHeight: React.PropTypes.string,
    pageSize: React.PropTypes.number,
    page: React.PropTypes.number,
    layoutGaps: React.PropTypes.bool,
    onChangeLoadStatus: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      rowQuery: undefined,  //Defaults set at render time
      columnQuery: undefined,
      layoutGaps: true,
      rowHeight: 10,
      pageSize: 100,
      page: 0,
      cellColour: 'call',
      rowSort: null
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
    const visibleGenomicPositions = genomicPositions.subarray ? genomicPositions.subarray(startIndex, endIndex) : genomicPositions.slice(startIndex, endIndex);

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

  getDefinedQuery(query, table) {
    return query ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  //Called by DataFetcherMixin on componentWillReceiveProps
  fetchData(props, requestContext) {
    let {chromosome, start, end, width, sideWidth, table, columnQuery, rowQuery, rowLabel, cellColour, cellAlpha, cellHeight, page, pageSize, rowSort} = props;
    let config = this.config.twoDTablesById[table];
    columnQuery = this.getDefinedQuery(columnQuery, config.columnDataTable);
    rowQuery = this.getDefinedQuery(rowQuery, config.rowDataTable);

    const dataInvlidatingProps = ['chromosome', 'cellColour', 'cellAlpha', 'cellHeight',  'rowQuery', 'columnQuery', 'rowLabel', 'rowSort', 'layoutGaps', 'page', 'pageSize'];
    if (dataInvlidatingProps.some((name) => this.props[name] !== props[name])) {
      this.applyData(props, null);
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
        dataset: this.config.dataset,
        table,
        colQry: SQL.WhereClause.encode(columnQuery),
        colOrder: columnTableConfig.position,
        rowQry: rowQuery,
        rowOrder: rowSort,
        rowOffset: page * pageSize,
        rowLimit: (page + 1) * pageSize,
        colProperties: colProperties.join('~'),
        rowProperties: rowProperties.join('~'),
        '2DProperties': twoDProperties.join('~'),
        colOnlyOnLimit: true
      };
      let cacheArgs = {
        method: 'twoDPageQuery',
        regionField: columnTableConfig.position,
        queryField: 'colQry',
        limitField: 'colFailLimit',
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
          this.applyData(this.props, null);
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(this.props, requestContext));
          throw error;
        });
    }
  },

  calculatedDerivedProperties(block) {
    let config = this.config.twoDTablesById[this.props.table].showInGenomeBrowser;
    if (config.call && block['2D_' + config.call]) {
      let callMatrix = block['2D_' + config.call];
      let callMatrixArray = callMatrix.array;
      let ploidy = callMatrix.shape[2] || 1;
      let callSummaryMatrix = new Int8Array(callMatrixArray.length / ploidy);
      for (let row = 0, lrows = callMatrix.shape[0]; row < lrows; row++) {
        for (let col = 0, lcols = callMatrix.shape[1]; col < lcols; col++) {
          let call = -2; //init
          for (let allele = 0; allele < ploidy; allele++) {
            let c = callMatrixArray[row * lcols * ploidy + col * ploidy + allele];

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
          callSummaryMatrix[row * lcols + col] = call;
        }
      }
      callSummaryMatrix = {
        array: callSummaryMatrix,
        shape: [callMatrix.shape[0], callMatrix.shape[1]]
      };
      block['2D__call'] = callSummaryMatrix;
    }
    if (config.alleleDepth && block['2D_' + config.alleleDepth]) {
      let depthMatrix = block['2D_' + config.alleleDepth];
      let depthMatrixArray = depthMatrix.array;
      let arity = depthMatrix.shape[2] || 1;
      let fractionalMatrix = new Uint8ClampedArray(depthMatrixArray.length / arity);
      for (let row = 0, lrows = depthMatrix.shape[0]; row < lrows; row++) {
        for (let col = 0, lcols = depthMatrix.shape[1]; col < lcols; col++) {
          let refCount = depthMatrixArray[row * lcols * arity + col * arity];
          let altCount = 0;
          for (let allele = 1; allele < arity; allele++) {
            altCount += depthMatrixArray[row * lcols * arity + col * arity + allele];
          }
          let fraction = altCount / (refCount + altCount);
          fraction = Math.max(0, fraction);
          fraction = Math.min(1, fraction);
          fractionalMatrix[row * lcols + col] = altCount + refCount > 0 ? 1 + 255 * fraction : 0;
        }
      }
      fractionalMatrix = {
        array: fractionalMatrix,
        shape: [depthMatrix.shape[0], depthMatrix.shape[1]]
      };
      block['2D__fraction'] = fractionalMatrix;
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
    if (!dataBlocks) {
      this.setState({
        rowData: {
          id: {array: [], shape: [0]},
          label: {array: [], shape: [0]}
        },
        dataBlocks: [],
        layoutBlocks: [],
        genomicPositions: new Int32Array(0)
      });
      return;
    }
    const {table, rowLabel} = props;
    const config = this.config.twoDTablesById[table];
    const columnTableConfig = this.config.tablesById[config.columnDataTable];
    const rowTableConfig = this.config.tablesById[config.rowDataTable];
    //Concatenate all the positions for quick reference
    let genomicPositions = combineBlocks(dataBlocks, `col_${columnTableConfig.position}`);
    //Don't pass any data if there are no rows
    if (dataBlocks.length > 0 && dataBlocks[0][`row_${rowTableConfig.primKey}`].shape[0] === 0) {
      dataBlocks = [];
    }
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
    let {columnQuery, rowQuery, width, sideWidth, table, start, end, rowHeight, rowLabel, cellColour, cellAlpha, cellHeight} = this.props;
    const {rowData, dataBlocks, layoutBlocks, genomicPositions, colWidth} = this.state;
    const config = this.config.twoDTablesById[table];
    const rowConfig = this.config.tablesById[config.rowDataTable];
    columnQuery = this.getDefinedQuery(columnQuery, config.columnDataTable);
    rowQuery = this.getDefinedQuery(rowQuery, config.rowDataTable);
    const numRows = rowData ? rowData.id.shape[0] : 0;
    return (
      <ChannelWithConfigDrawer
        width={width}
        sideWidth={sideWidth}
        height={(rowHeight * numRows) + FAN_HEIGHT}
        sideComponent={<GenotypesRowHeader
          table={table}
          width={sideWidth}
          height={rowHeight * numRows}
          rowData={rowData}
          rowHeight={rowHeight}
          rowLabel={rowLabel || rowConfig.primKey}
        />}
        //Override component update to get latest in case of skipped render
        configComponent={<GenotypesControls {...this.props}
                                            columnQuery={columnQuery}
                                            rowQuery={rowQuery}
                                            setProps={this.redirectedProps.setProps}/>}
        legendComponent={<GenotypesLegend />}
        onClose={this.redirectedProps.onClose}
      >
        <GenotypesFan
          genomicPositions={genomicPositions}
          layoutBlocks={layoutBlocks}
          dataBlocks={dataBlocks}
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
          height={rowHeight * numRows}
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
        'rowHeight',
        'columnQuery',
        'rowQuery',
        'cellColour',
        'cellAlpha',
        'cellHeight',
        'layoutGaps',
        'rowSort',
        'pageSize',
        'page'
      ],
      redirect: ['setProps']
    }),
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    columnQuery: React.PropTypes.string,
    rowQuery: React.PropTypes.string,
    rowLabel: React.PropTypes.string,
    rowSort: React.PropTypes.string,
    rowHeight: React.PropTypes.number,
    cellColour: React.PropTypes.string,
    cellAlpha: React.PropTypes.string,
    cellHeight: React.PropTypes.string,
    pageSize: React.PropTypes.number,
    page: React.PropTypes.number,
    layoutGaps: React.PropTypes.bool,
  },

  handleDownload() {

    let params = {
      dataset: this.config.dataset,
      tableNamePlural: this.config.twoDTablesById[this.props.table].namePlural,
      colTableCapNamePlural: this.config.tablesById[this.config.twoDTablesById[this.props.table].columnDataTable].capNamePlural,
      rowTableCapNamePlural: this.config.tablesById[this.config.twoDTablesById[this.props.table].rowDataTable].capNamePlural,
      columnQueryAsString: QueryConverter.tableQueryToString({
        table: this.config.tablesById[this.config.twoDTablesById[this.props.table].columnDataTable].id,
        query: this.props.columnQuery,
        properties: this.config.tablesById[this.config.twoDTablesById[this.props.table].columnDataTable].properties
      }),
      rowQueryAsString: QueryConverter.tableQueryToString({
        table: this.config.tablesById[this.config.twoDTablesById[this.props.table].rowDataTable].id,
        query: this.props.rowQuery,
        properties: this.config.tablesById[this.config.twoDTablesById[this.props.table].rowDataTable].properties
      })
    };

    DataDownloader.downloadGenotypeData({...params, ...this.props});
  },

  render() {
    let {table, columnQuery, rowQuery, rowHeight, rowLabel, cellColour, cellAlpha, cellHeight, layoutGaps, rowSort, pageSize, page} = this.props;
    const config = this.config.twoDTablesById[table];
    return (
      <div className="channel-controls">
        <div className="control">
          <FilterButton table={config.columnDataTable} query={columnQuery}
                        name={this.config.tablesById[config.columnDataTable].capNamePlural}
                        onPick={(columnQuery) => this.redirectedProps.setProps({columnQuery})}/>
        </div>
        <div className="control">
          <FilterButton table={config.rowDataTable} query={rowQuery}
                        name={this.config.tablesById[config.rowDataTable].capNamePlural}
                        onPick={(rowQuery) => this.redirectedProps.setProps({rowQuery})}/>
        </div>
        <div className="control">
          <FlatButton label="Download data"
                      primary={true}
                      onClick={() => this.handleDownload()}
                      icon={<Icon fixedWidth={true} name="download" />}
          />
        </div>
        <div className="control">
          <PropertySelector table={config.rowDataTable}
                            value={rowLabel || this.config.tablesById[config.rowDataTable].primKey}
                            label="Row Label"
                            onSelect={(rowLabel) => this.redirectedProps.setProps({rowLabel, rowSort: rowSort || rowLabel})}/>
        </div>
        <div className="control">
          <PropertySelector table={config.rowDataTable}
                            value={rowSort}
                            label="Row Sort"
                            allowNull={true}
                            onSelect={(rowSort) => this.redirectedProps.setProps({rowSort})}/>
        </div>
        <div className="control">
          <NumericInput value={rowHeight} onChange={(rowHeight) => this.redirectedProps.setProps({rowHeight})}/>
        </div>
        <div className="control">
          <NumericInput value={pageSize} onChange={(pageSize) => this.redirectedProps.setProps({pageSize})}/>
        </div>
        <div className="control">
          <NumericInput value={page} onChange={(page) => this.redirectedProps.setProps({page})}/>
        </div>
        <div className="control">
          <SelectField style={{width: '140px'}}
                       value={cellColour}
                       autoWidth={true}
                       floatingLabelText="Cell Colour"
                       onChange={(e, i, cellColour) => this.redirectedProps.setProps({cellColour})}>
            <MenuItem value="call" primaryText="Call"/>
            <MenuItem value="fraction" primaryText="Ref fraction"/>
          </SelectField>
        </div>
        <div className="control">
          <SelectField style={{width: '256px'}}
                       value={cellAlpha}
                       autoWidth={true}
                       floatingLabelText="Cell Opacity"
                       onChange={(e, i, cellAlpha) => this.redirectedProps.setProps({cellAlpha: cellAlpha === 'none' ? undefined : cellAlpha})}>
            <MenuItem value="none" primaryText="None"/>
            {config.showInGenomeBrowser.extraProperties.map((prop) => <MenuItem value={prop} key={prop} primaryText={config.propertiesById[prop].name}/>)}
          </SelectField>
        </div>
        <div className="control">
          <SelectField style={{width: '256px'}}
                       value={cellHeight}
                       autoWidth={true}
                       floatingLabelText="Cell Height"
                       onChange={(e, i, cellHeight) => this.redirectedProps.setProps({cellHeight: cellHeight === 'none' ? undefined : cellHeight})}>
            <MenuItem value="none" primaryText="None"/>
            {config.showInGenomeBrowser.extraProperties.map((prop) => <MenuItem value={prop} key={prop} primaryText={config.propertiesById[prop].name}/>)}
          </SelectField>
        </div>
        <div className="control">
          <div className="label">Space columns:</div>
          <Checkbox
            name="layoutGaps"
            defaultChecked={layoutGaps}
            style={{width: 'inherit'}}
            onCheck={(e, checked) => this.redirectedProps.setProps({layoutGaps: checked})}/>
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

export default GenotypesChannel;
