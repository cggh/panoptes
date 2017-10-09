import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import classNames from 'classnames';
import Color from 'color';

// Lodash
import _throttle from 'lodash.throttle';
import _cloneDeep from 'lodash.clonedeep';
import _some from 'lodash.some';
import _forEach from 'lodash.foreach';
import _filter from 'lodash.filter';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import 'es6-shim'; //For IE11 as ES6 calls in fixed-data-table
import {Table, Column} from 'fixed-data-table-2';
import 'fixed-data-table-2/dist/fixed-data-table.css';

// Panoptes components
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';
import PropertyCell from 'panoptes/PropertyCell';
import PropertyHeader from 'panoptes/PropertyHeader';
import resolveJoins from 'panoptes/resolveJoins';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';
import DetectResize from 'utils/DetectResize';

// Constants in this component
const MAX_COLOR = Color('#f3a891');
const ROW_HEIGHT = 30;
const HEADER_HEIGHT = 50;
const SCROLLBAR_HEIGHT = 15;

const MEASURED_COLUMN_WIDTHS = {};

let DataTableView = createReactClass({
  displayName: 'DataTableView',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'query', 'columns', 'order', 'startRowIndex', 'joins')
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    query: PropTypes.string,
    order: PropTypes.array,
    startRowIndex: PropTypes.number,
    columns: PropTypes.array,
    columnWidths: PropTypes.object,
    onColumnResize: PropTypes.func,
    onOrderChange: PropTypes.func,
    onShowableRowsCountChange: PropTypes.func,
    onFetchedRowsCountChange: PropTypes.func,
    onTotalRowsCountChange: PropTypes.func,
    className: PropTypes.string,
    maxRowsPerPage: PropTypes.number,
    joins: PropTypes.array
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      table: null,
      query: undefined,
      order: [],
      startRowIndex: 0,
      columns: [],
      columnWidths: {}
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
      width: 0,
      height: 0,
      showableRowsCount: 0,
      totalRowsCount: 0
    };
  },

  componentDidMount() {
    this.setShowableRows = _throttle(this.setShowableRows, 500);
  },

  icon() {
    return this.tableConfig().icon;
  },

  title() {
    return this.props.query !== undefined ? `${this.tableConfig().capNamePlural} subset` : this.tableConfig().capNamePlural;
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {table, columns, order, startRowIndex, query, maxRowsPerPage, joins} = props;
    let {showableRowsCount} = this.state;

    if (columns.length > 0) {
      this.setState({loadStatus: 'loading'});

      let stopRowIndex = undefined;

      if (maxRowsPerPage !== undefined && maxRowsPerPage > 0) {
        stopRowIndex = startRowIndex + maxRowsPerPage - 1;
      } else if (showableRowsCount !== undefined && showableRowsCount > 0) {
        stopRowIndex = startRowIndex + showableRowsCount - 1;
      } else {
        stopRowIndex = undefined;
      }

      let fetchStartRowIndex = startRowIndex !== undefined ? Math.floor(startRowIndex / 100) * 100 : undefined;
      let fetchStopRowIndex = stopRowIndex !== undefined ? (Math.floor(stopRowIndex / 100) + 1) * 100 : undefined;

      let queryAPIargs = resolveJoins({
        database: this.config.dataset,
        table: this.config.tablesById[table].id,
        columns,
        orderBy: order,
        query: this.getDefinedQuery(query, table),
        start: fetchStartRowIndex,
        stop: fetchStopRowIndex,
        transpose: true, //We want rows, not columns,
        joins
      }, this.config);

      requestContext.request((componentCancellation) =>
        Promise.all([
          LRUCache.get(
            `query${JSON.stringify(queryAPIargs)}`,
            (cacheCancellation) =>
              API.query({cancellation: cacheCancellation, ...queryAPIargs}),
            componentCancellation
          ),
          LRUCache.get(
            `rowsCount${JSON.stringify(queryAPIargs)}`,
            (cacheCancellation) =>
              API.rowsCount({cancellation: cacheCancellation, ...queryAPIargs}),
            componentCancellation
          )
        ])
      )
        .then(([rows, rowsCount]) => {
          if (fetchStartRowIndex !== undefined && startRowIndex !== undefined && stopRowIndex !== undefined) {
            rows = rows.slice(startRowIndex - fetchStartRowIndex, stopRowIndex - fetchStartRowIndex + 1);
          }
          this.setState({
            loadStatus: 'loaded',
            rows,
            totalRowsCount: rowsCount
          });
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((xhr) => {
          ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
          this.setState({loadStatus: 'error'});
        });
    } else {
      this.setState({rows: []});
    }
  },

  handleColumnResize(width, column) {
    if (this.props.onColumnResize)
      this.props.onColumnResize(column, width);
    //So that "isResizing" on FDT gets set back to false, force an update
    this.forceUpdate();
  },

  handleOrderChange(column) {
    let currentOrder = this.props.order;
    //Choose direction based on if this column already in order
    let newDir = 'asc';
    _forEach(currentOrder, ([dir, orderCol]) => {
      if (orderCol === column) {
        newDir = {asc: 'desc', desc: null}[dir];
      }
    });
    //Remove this column from the sort order
    currentOrder = _filter(currentOrder, ([dir, orderCol]) => orderCol !== column);
    //Then add it to the end (if needed)
    if (newDir) {
      currentOrder.push([newDir, column]);
    }
    if (this.props.onOrderChange) {
      this.props.onOrderChange(currentOrder);
    }
  },

  handleResize(size) {
    this.setState(size);
    this.setShowableRows(size);
  },

  setShowableRows(size) {
//    this.setState({showableRowsCount: size.height ? Math.floor((size.height - HEADER_HEIGHT - SCROLLBAR_HEIGHT) / ROW_HEIGHT) : 0});
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.props.onShowableRowsCountChange && prevState.showableRowsCount !== this.state.showableRowsCount) {
      this.forceFetch();
      this.props.onShowableRowsCountChange(this.state.showableRowsCount);
    }
    if (this.props.onFetchedRowsCountChange && prevState.rows.length !== this.state.rows.length) {
      this.props.onFetchedRowsCountChange(this.state.rows.length);
    }
    if (this.props.onTotalRowsCountChange && prevState.totalRowsCount !== this.state.totalRowsCount) {
      this.props.onTotalRowsCountChange(this.state.totalRowsCount);
    }
  },

  calcColumnWidthPx(column) {
    let {columnWidths} = this.props;
    // If a pixel width for this column is in the props, use that.
    if (columnWidths[column]) {
      return columnWidths[column];
    }

    let columnData = this.propertiesByColumn(column);

    // If a pixel width for this column is in the config, use that.
    if (columnData.defaultWidth) {
      return columnData.defaultWidth;
    }

    if (MEASURED_COLUMN_WIDTHS[columnData.tableId] && MEASURED_COLUMN_WIDTHS[columnData.tableId][columnData.id]) {
      return MEASURED_COLUMN_WIDTHS[columnData.tableId][columnData.id];
    }
    // NB: Columns need to be initialized with at least a non-null.
    let columnWidthPx = 0;

    // NB: Needs to allow for
    // sort icon (20px)
    // + info icon (20px) (if set on this column)
    // + columnResizerContainer(6px, inc. columnResizerKnob (4px))
    let paddingWidthPx = 26 + (columnData.description ? 20 : 0);

    // NB: This method is not supported by IE < v9.0
    // Also used in GenotypesTable.js

    let propertyHeaderElementId = `PropertyHeader_${column}`;
    let propertyHeaderElement = document.getElementById(propertyHeaderElementId);

    if (propertyHeaderElement !== undefined && propertyHeaderElement !== null) {

      let propertyHeaderTextElement = propertyHeaderElement.getElementsByClassName('label')[0];
      let propertyHeaderTextElementStyles = window.getComputedStyle(propertyHeaderTextElement);
      let canvas2dContext = this.canvas2dContext || (this.canvas2dContext = document.createElement('canvas').getContext('2d'));
      // NB: syntax [font style][font weight][font size][font face]
      canvas2dContext.font = `${propertyHeaderTextElementStyles['fontStyle']} ${propertyHeaderTextElementStyles['fontWeight']} ${propertyHeaderTextElementStyles['fontSize']} "${propertyHeaderTextElementStyles['fontFamily']}"`;
      columnWidthPx = Math.ceil(canvas2dContext.measureText(columnData.name).width) + paddingWidthPx;
      MEASURED_COLUMN_WIDTHS[columnData.tableId] = MEASURED_COLUMN_WIDTHS[columnData.tableId] || {};
      MEASURED_COLUMN_WIDTHS[columnData.tableId][columnData.id] = columnWidthPx;
    }

    return columnWidthPx;
  },

  render() {
    let {className, columns, order, table} = this.props;
    let {loadStatus, rows, width, height} = this.state;

    if (!this.tableConfig()) {
      console.error(`Table ${this.props.table} doesn't exist'`);
      return null;
    }

    if (columns.length > 0) {
      return (
        <DetectResize onResize={this.handleResize}>
          <div className={classNames('load-container', className)}>
            <Table
              rowHeight={ROW_HEIGHT}
              //rowGetter={(index) => rows[index]}
              rowsCount={rows.length}
              width={width}
              height={height}
              headerHeight={HEADER_HEIGHT}
              //headerDataGetter={this.headerData}
              onColumnResizeEndCallback={this.handleColumnResize}
              isColumnResizing={false}
            >
              {columns.map((column) => {

                let columnData = this.propertiesByColumn(column);
                let {id, isPrimKey} = columnData;
                let colTable = columnData.tableId;
                let asc = _some(order, ([dir, orderCol]) => dir === 'asc' && orderCol === column);
                let desc = _some(order, ([dir, orderCol]) => dir === 'desc' && orderCol === column);
                return (
                  <Column
                    width={this.calcColumnWidthPx(column)}
                    key={column}
                    columnKey={column}
                    fixed={isPrimKey}
                    allowCellsRecycling={true}
                    isResizable={true}
                    minWidth={50}
                    header={
                      <PropertyHeader
                        id={`PropertyHeader_${column}`}
                        className={classNames({
                          'pointer': true,
                          'table-row-header': true,
                          'sort-column-ascending': asc,
                          'sort-column-descending': desc
                        })}
                        style={{width: this.calcColumnWidthPx(column)}}
                        table={table}
                        propId={column}
                        onClick={() => this.handleOrderChange(column)}
                        prefix={(asc || desc) ?
                          <Icon className="sort" name={asc ? 'sort-amount-asc' : 'sort-amount-desc'}/> :
                          null}
                        tooltipPlacement={'bottom'}
                        tooltipTrigger={['click']}
                      />
                    }
                    cell={({rowIndex}) => {

                      let background = 'inherit';
                      let {maxVal, minVal, valueColours, showBar, alignment} = columnData;
                      //Qualify foreign names
                      let cellData = rows[rowIndex][colTable === table ? id : `${colTable}.${id}`];
                      if (showBar && cellData !== null && maxVal !== undefined && minVal !== undefined) {
                        cellData = parseFloat(cellData);
                        let percent = 100 * (cellData - minVal) / (maxVal - minVal);
                        background = `linear-gradient(to right, ${rowIndex % 2 ? 'rgb(115, 190, 252)' : 'rgb(150, 207, 253)'} ${percent}%, rgba(0,0,0,0) ${percent}%`;
                      } else if (cellData !== null && maxVal !== undefined && minVal !== undefined) {
                        let clippedCellData = Math.min(Math.max(parseFloat(cellData), minVal), maxVal);
                        background = _cloneDeep(MAX_COLOR).lighten(0.3 * (1 - (clippedCellData - minVal) / (maxVal - minVal))).string();
                      }
                      if (valueColours) {
                        let col = valueColours[cellData] || valueColours['_other_'];
                        if (col) {
                          col = Color(col).lighten(0.3);
                          if (rowIndex % 2)
                            col.darken(0.1);

                          background = col.string();
                        }
                      }

                      return (
                        <div className="table-row-cell"
                          style={{
                            textAlign: alignment,
                            width: this.calcColumnWidthPx(column),
                            height: `${ROW_HEIGHT}px`,
                            background
                          }}>
                          <PropertyCell prop={columnData} value={cellData}/>
                        </div>
                      );
                    }}
                  />
                );
              })
              }
            </Table>
            <Loading status={loadStatus}/>
          </div>
        </DetectResize>
      );
    } else {
      return (
        <div className={classNames('load-container', className)}>
          <Loading status="custom">No columns selected</Loading>
        </div>
      );
    }
  },
});

export default DataTableView;
