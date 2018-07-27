import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import FileSaver from 'file-saver';
import {Motion, spring} from 'react-motion';
import Hammer from 'react-hammerjs'; //We need hammer as "onClick" would fire for panning moves

import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import _filter from 'lodash.filter';
import _sumBy from 'lodash.sumby';
import _sortedIndex from 'lodash.sortedindex';
import _sortedLastIndex from 'lodash.sortedlastindex';
import _sortBy from 'lodash.sortby';
import _last from 'lodash.last';
import _some from 'lodash.some';
import _takeRight from 'lodash.takeright';
import _unique from 'lodash.uniq';
import _isFinite from 'lodash.isfinite';
import Select from '@material-ui/core/Select';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import Checkbox from '@material-ui/core/Checkbox';
import Button from 'ui/Button';

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
import queryToString from 'util/queryToString';
import RandomSubsetSizeSelector from 'panoptes/RandomSubsetSizeSelector';
import 'genotypes.scss';
const FAN_HEIGHT = 60;

let GenotypesChannel = createReactClass({
  displayName: 'GenotypesChannel',

  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'setProps',
        'onClose',
        'onChangeHoverPos'
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
        'page',
        'rowRandomSubsetSize',
        'hoverPos'
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
      'page',
      'rowRandomSubsetSize'
    ),
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
    columnQuery: PropTypes.string,
    rowQuery: PropTypes.string,
    rowLabel: PropTypes.string,
    rowSort: PropTypes.string,
    rowHeight: PropTypes.number,
    cellColour: PropTypes.string,
    cellAlpha: PropTypes.string,
    cellHeight: PropTypes.string,
    pageSize: PropTypes.number,
    page: PropTypes.number,
    hoverPos: PropTypes.number,
    onChangeHoverPos: PropTypes.func,
    layoutGaps: PropTypes.bool,
    onChangeLoadStatus: PropTypes.func,
    rowRandomSubsetSize: PropTypes.number
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
      rowSort: null,
      onChangeLoadStatus: () => null
    };
  },

  getInitialState() {
    return {
      blocks: [],
      colPositions: new Float64Array(0),
      genomicPositions: new Float64Array(0),
      visibleGenomicPositions: new Float64Array(0),
      colWidth: 1,
      visibleTop: 0,
      hoverClick: null
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
    let {
      chromosome, start, end, width, sideWidth, table, columnQuery, rowQuery,
      rowLabel, cellColour, cellAlpha, cellHeight, page, pageSize, rowSort,
      rowRandomSubsetSize
    } = props;
    let config = this.config.twoDTablesById[table];
    columnQuery = this.getDefinedQuery(columnQuery, config.columnDataTable);
    rowQuery = this.getDefinedQuery(rowQuery, config.rowDataTable);
    const dataInvalidatingProps = [
      'chromosome', 'cellColour', 'cellAlpha', 'cellHeight', 'rowQuery',
      'columnQuery', 'rowLabel', 'rowSort', 'layoutGaps', 'page', 'pageSize',
      'rowRandomSubsetSize'
    ];
    if (dataInvalidatingProps.some((name) => this.props[name] !== props[name])) {
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
    if (dataInvalidatingProps.some((name) => this.props[name] !== props[name]) || !(this.blockLevel === blockLevel
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
        rowRandomSample: rowRandomSubsetSize,
        rowOffset: rowRandomSubsetSize ? undefined : page * pageSize,
        rowLimit: rowRandomSubsetSize ? undefined : (page + 1) * pageSize,
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
    if (config.call && block[`2D_${config.call}`]) {
      let callMatrix = block[`2D_${config.call}`];
      let callMatrixArray = callMatrix.array;
      let ploidy = callMatrix.shape[2] || 1;
      let callSummaryMatrix = new Int8Array(callMatrixArray.length / ploidy);
      for (let col = 0, numCols = callMatrix.shape[0]; col < numCols; col++) {
        for (let row = 0, numRows = callMatrix.shape[1]; row < numRows; row++) {
          let call = -2; //init
          for (let allele = 0; allele < ploidy; allele++) {
            let c = callMatrixArray[(col * numRows * ploidy) + (row * ploidy) + allele];
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
          callSummaryMatrix[col * numRows + row] = call;
        }
      }
      callSummaryMatrix = {
        array: callSummaryMatrix,
        shape: [callMatrix.shape[0], callMatrix.shape[1]]
      };
      block['2D__call'] = callSummaryMatrix;
    }
    if (config.alleleDepth && block[`2D_${config.alleleDepth}`]) {
      let depthMatrix = block[`2D_${config.alleleDepth}`];
      let depthMatrixArray = depthMatrix.array;
      let arity = depthMatrix.shape[2] || 1;
      let fractionalMatrix = new Uint8ClampedArray(depthMatrixArray.length / arity);
      for (let col = 0, lcols = depthMatrix.shape[0]; col < lcols; col++) {
        for (let row = 0, lrows = depthMatrix.shape[1]; row < lrows; row++) {
          let refCount = depthMatrixArray[col * lrows * arity + row * arity];
          let altCount = 0;
          for (let allele = 1; allele < arity; allele++) {
            altCount += depthMatrixArray[col * lrows * arity + row * arity + allele];
          }
          let fraction = altCount / (refCount + altCount);
          fraction = Math.max(0, fraction);
          fraction = Math.min(1, fraction);
          fractionalMatrix[col * lrows + row] = altCount + refCount > 0 ? 1 + 255 * fraction : 0;
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
    let colPrimKeys = combineBlocks(dataBlocks, `col_${columnTableConfig.primKey}`);
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
      colPrimKeys,
      ...this.layoutColumns(props, genomicPositions)
    });
  },

  getDataBlocks() {
    return this.state.dataBlocks;
  },

  handleScroll(scrollDiv) {
    this.setState({visibleTop:
      -(this.container.getBoundingClientRect().top - scrollDiv.getBoundingClientRect().top)});
  },

  xyToIndex(x, y) {
    const {width, sideWidth, start, end, rowHeight} = this.props;
    const {rowData, layoutBlocks, genomicPositions, colPrimKeys, colWidth, visibleTop} = this.state;
    const numRows = rowData ? rowData.id.shape[0] : 0;
    const fanTop = Math.min(rowHeight * numRows,
      Math.max(0, visibleTop));
    const scale =  (width - sideWidth) / (end - start);
    const pixColWidth = colWidth * scale;

    let nearest = 100;
    let nearestClick = 10;
    let nearestPos = null;
    let nearestClickIndex = null;
    for (let i = 0, iend = layoutBlocks.length; i < iend; ++i) {
      const [blockStart, blockEnd, colStart] = layoutBlocks[i];
      for (let j = blockStart, jCol = colStart + 0.5; j < blockEnd; ++j, ++jCol) {
        const columnPixel = jCol * pixColWidth;
        if (Math.abs(x - columnPixel) < nearest) {
          nearest = Math.abs(x - columnPixel);
          nearestPos = genomicPositions[j];
        }
        if (y < fanTop + FAN_HEIGHT && y > fanTop + FAN_HEIGHT - 20) { //Only click on hat
          if (Math.abs(x - columnPixel) < nearestClick) {
            nearestClick = Math.abs(x - columnPixel);
            nearestClickIndex = colPrimKeys[j];
          }
        }
      }
    }
    return {nearestPos, nearestClickIndex};
  },

  convertXY(e) {
    let rect = this.container.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  },

  setHover({nearestPos, nearestClickIndex}) {
    if (this.props.onChangeHoverPos) {
      this.props.onChangeHoverPos(nearestPos);
    }
    this.setState({hoverClick: nearestClickIndex});
  },

  handleMouseMove(e) {
    e.persist();
    e.hoverHandled = true;
    if (!this.state.layoutBlocks) return;
    let [x, y] = this.convertXY(e);
    let {nearestPos, nearestClickIndex} = this.xyToIndex(x, y);
    this.setHover({nearestPos, nearestClickIndex});
  },

  handleMouseOver(e) {
    this.handleMouseMove(e);
  },

  handleMouseOut(e) {
    this.setState({hoverClick: false});
  },

  handleClick(e) {
    if (this.state.hoverClick != null) {
      this.getFlux().actions.panoptes.dataItemPopup({
        table: this.config.twoDTablesById[this.props.table].columnDataTable,
        primKey: this.state.hoverClick
      });
    }
  },

  render() {
    let {columnQuery, rowQuery, width, sideWidth, table, start, end, rowHeight, rowLabel, cellColour, cellAlpha, cellHeight, hoverPos} = this.props;
    const {rowData, dataBlocks, layoutBlocks, genomicPositions, colWidth, visibleTop, hoverClick} = this.state;
    const config = this.config.twoDTablesById[table];
    const rowConfig = this.config.tablesById[config.rowDataTable];
    columnQuery = this.getDefinedQuery(columnQuery, config.columnDataTable);
    rowQuery = this.getDefinedQuery(rowQuery, config.rowDataTable);
    const numRows = rowData ? rowData.id.shape[0] : 0;

    let initColWidthSpring = {
      colWidth: _isFinite(colWidth) ? colWidth : 0,
    };
    let colWidthSpring = {
      colWidth: spring(initColWidthSpring.colWidth),
    };

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
          getDataBlocks={this.getDataBlocks}
          setProps={this.redirectedProps.setProps}/>}
        legendComponent={<GenotypesLegend />}
        onClose={this.redirectedProps.onClose}
      >
        <Motion style={colWidthSpring} defaultStyle={initColWidthSpring}>
          {(interpolated) => {
            let {colWidth} = interpolated;
            return (
              <Hammer onTap={this.handleClick}>
                <div
                  ref={(node) => this.container = node}
                  className="genotypes-channel"
                  style={{cursor: hoverClick ? 'pointer' : 'inherit'}}
                  onMouseOver={this.handleMouseOver}
                  onMouseMove={this.handleMouseMove}
                  onMouseOut={this.handleMouseOut}
                >
                  <div style={{height: `${FAN_HEIGHT}px`}} />
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
                    hoverPos={hoverPos}
                  />
                  <GenotypesFan
                    top={Math.min(rowHeight * numRows,
                      Math.max(0, visibleTop))}
                    genomicPositions={genomicPositions}
                    layoutBlocks={layoutBlocks}
                    dataBlocks={dataBlocks}
                    width={width - sideWidth}
                    height={FAN_HEIGHT}
                    start={start}
                    end={end}
                    colWidth={colWidth}
                    hoverPos={hoverPos}
                  />
                </div>
              </Hammer>
            );
          }}</Motion>
      </ChannelWithConfigDrawer>
    );
  },
});

const GenotypesControls = createReactClass({
  displayName: 'GenotypesControls',

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
        'page',
        'rowRandomSubsetSize'
      ],
      redirect: ['setProps']
    }),
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    columnQuery: PropTypes.string,
    rowQuery: PropTypes.string,
    rowLabel: PropTypes.string,
    rowSort: PropTypes.string,
    rowHeight: PropTypes.number,
    cellColour: PropTypes.string,
    cellAlpha: PropTypes.string,
    cellHeight: PropTypes.string,
    pageSize: PropTypes.number,
    page: PropTypes.number,
    layoutGaps: PropTypes.bool,
    getDataBlocks: PropTypes.func,
    rowRandomSubsetSize: PropTypes.number
  },

  handleDownload() {
    const {table, chromosome, columnQuery, rowQuery, start, end, cellColour, getDataBlocks} = this.props;
    const tableConfig = this.config.twoDTablesById[table];
    const columnTableConfig = this.config.tablesById[tableConfig.columnDataTable];
    const rowTableConfig = this.config.tablesById[tableConfig.rowDataTable];
    const columnQueryAsString = queryToString({
      query: columnQuery,
      properties: columnTableConfig.properties
    });
    const rowQueryAsString = queryToString({
      query: rowQuery,
      properties: rowTableConfig.properties
    });

    let data = '';
    data += `#Dataset: ${this.config.dataset}\r\n`;
    data += `#Table: ${tableConfig.namePlural}${(cellColour == 'call' ? ' Calls' : ' Allele Depths')}\r\n`;
    data += `#${columnTableConfig.capNamePlural} filter: ${columnQueryAsString}\r\n`;
    data += `#${rowTableConfig.capNamePlural} filter: ${rowQueryAsString}\r\n`;
    data += `#Choromosome: ${chromosome}\r\n`;
    data += `#Start: ${Math.floor(start)}\r\n`;
    data += `#End: ${Math.ceil(end)}\r\n`;
    data += `#URL: ${window.location.href}\r\n`;
    data += 'Position\t';

    const dataBlocks = getDataBlocks();
    if (dataBlocks.length == 0) {
      ErrorReport(this.getFlux(), 'No genotype data to download');
      return;
    }
    if (_some(dataBlocks, (block) => block._tooBig)) {
      ErrorReport(this.getFlux(), 'Too much genotype data to download - zoom in');
      return;
    }

    const rowPrimaryKey = dataBlocks[0][`row_${rowTableConfig.primKey}`].array;
    for (var i = 0; i < rowPrimaryKey.length; i++)
      data += `${rowPrimaryKey[i]}\t`;
    data += '\r\n';

    for (let b = 0; b < dataBlocks.length; ++b) {
      let block = dataBlocks[b];
      let propArray = block[`2D_${tableConfig.showInGenomeBrowser[cellColour == 'call' ? 'call' : 'alleleDepth']}`];
      let shape = propArray.shape;
      propArray = propArray.array;
      let numRows = shape[1];
      let ploidy = shape[2] || 1;
      let positions = block[`col_${columnTableConfig.position}`].array;
      for (i = 0; i < positions.length; i++) {
        if (positions[i] >= start && positions[i] <= end) {
          data += `${positions[i]}\t`;
          for (let j = 0; j < rowPrimaryKey.length; j++) {
            for (let k = 0; k < ploidy; k++) {
              data += propArray[(i * numRows * ploidy) + (j * ploidy) + k];
              if (k < ploidy - 1)
                data += ',';
            }
            data += '\t';
          }
          data += '\r\n';
        }
      }
    }

    let blob = new Blob([data], {type: 'text/plain'});
    FileSaver.saveAs(blob,
      `${this.config.dataset}-${cellColour == 'call' ? 'Calls' : ' Allele Depths'}-${tableConfig.tableNamePlural}-${chromosome}_${Math.floor(start)}-${Math.ceil(end)}.txt`);
  },

  handleChangeRandomSubsetSize(rowRandomSubsetSize) {
    this.redirectedProps.setProps({rowRandomSubsetSize});
  },

  render() {
    let {
      table, columnQuery, rowQuery, rowHeight, rowLabel, cellColour, cellAlpha,
      cellHeight, layoutGaps, rowSort, pageSize, page, rowRandomSubsetSize
    } = this.props;
    const config = this.config.twoDTablesById[table];

    return (
      <div className="channel-controls">
        <div className="control-group">
          <div className="control">
            <FilterButton table={config.columnDataTable} query={columnQuery}
              name={this.config.tablesById[config.columnDataTable].capNamePlural}
              onPick={(columnQuery) => this.redirectedProps.setProps({columnQuery})}/>
          </div>
        </div>
        <div className="control">
          <div className="control-group">
            <FilterButton table={config.rowDataTable} query={rowQuery}
              name={this.config.tablesById[config.rowDataTable].capNamePlural}
              onPick={(rowQuery) => this.redirectedProps.setProps({rowQuery})}/>
          </div>
        </div>
        <div className="control-group">
          <div className="control">
            <Button
              label="Download data"
              color="primary"
              onClick={() => this.handleDownload()}
              iconName="download"
            />
          </div>
        </div>
        <div className="control-group">
          <div className="control">
            <PropertySelector table={config.rowDataTable}
              value={rowLabel || this.config.tablesById[config.rowDataTable].primKey}
              label="Row label"
              onSelect={(rowLabel) => this.redirectedProps.setProps({
                rowLabel,
                rowSort: rowSort || rowLabel
              })}/>
          </div>
          <div className="control">
            <PropertySelector table={config.rowDataTable}
              value={rowSort}
              label="Row sort"
              allowNull={true}
              onSelect={(rowSort) => this.redirectedProps.setProps({rowSort})}/>
          </div>
          <div className="control">
            <RandomSubsetSizeSelector
              style={{width: '175px'}}
              value={rowRandomSubsetSize}
              onChange={(v) => this.handleChangeRandomSubsetSize(v)}
              label="Row random subset size"
            />
          </div>
          <div className="control">
            <NumericInput debounce width={3} label="Row height" value={rowHeight} onChange={(rowHeight) => this.redirectedProps.setProps({rowHeight})}/>
          </div>
        </div>
        <div className="control-group">
          <div className="control">
            <NumericInput debounce disabled={!!rowRandomSubsetSize} width={5} label="Page size" value={pageSize} onChange={(pageSize) => this.redirectedProps.setProps({pageSize})}/>
          </div>
          <div className="control">
            <NumericInput debounce disabled={!!rowRandomSubsetSize} width={3} label="Page" value={page} onChange={(page) => this.redirectedProps.setProps({page})}/>
          </div>
        </div>
        <div className="control-group">
          <div className="control">
            <Select value={cellColour === undefined ? '' : cellColour}
              fullWidth={true}
              label="Cell colour"
              onChange={(event, child) => this.redirectedProps.setProps({cellColour: event.target.value})}
              input={<Input id="cellColour" />}
            >
              <MenuItem value="call">Call</MenuItem>
              <MenuItem value="fraction">Ref fraction</MenuItem>
            </Select>
          </div>
          <div className="control">
            <Select value={cellAlpha === undefined ? 'none' : cellAlpha}
              fullWidth={true}
              label="Cell opacity"
              onChange={(event, child) => this.redirectedProps.setProps({cellAlpha: event.target.value === 'none' ? undefined : event.target.value})}
              input={<Input id="cellAlpha" />}
            >
              <MenuItem value="none">None</MenuItem>
              {config.showInGenomeBrowser.extraProperties.map((prop) =>
                <MenuItem value={prop} key={prop}>{config.propertiesById[prop].name}</MenuItem>
              )}
            </Select>
          </div>
          <div className="control">
            <Select value={cellHeight === undefined ? 'none' : cellHeight}
              fullWidth={true}
              label="Cell height"
              onChange={(event, child) => this.redirectedProps.setProps({cellHeight: event.target.value === 'none' ? undefined : event.target.value})}
              input={<Input id="cellHeight" />}
            >
              <MenuItem value="none">None</MenuItem>
              {config.showInGenomeBrowser.extraProperties.map((prop) =>
                <MenuItem value={prop} key={prop}>{config.propertiesById[prop].name}</MenuItem>
              )}
            </Select>
          </div>
        </div>
        <div className="control-group">
          <div className="control">
            <div className="label">Space columns:</div>
            <Checkbox
              name="layoutGaps"
              color="primary"
              checked={layoutGaps}
              style={{width: 'inherit'}}
              onChange={(e, checked) => this.redirectedProps.setProps({layoutGaps: checked})}/>
          </div>
        </div>

      </div>
    );
  },
});

const GenotypesLegend = createReactClass({
  displayName: 'GenotypesLegend',

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
  },
});

export default GenotypesChannel;
