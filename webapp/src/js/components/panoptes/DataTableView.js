import React from 'react';
import classNames from 'classnames';
import Color from 'color';

// Lodash
import _throttle from 'lodash/throttle';
import _cloneDeep from 'lodash/cloneDeep';
import _some from 'lodash/some';
import _forEach from 'lodash/forEach';
import _filter from 'lodash/filter';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

import {Table, Column} from 'fixed-data-table';
import 'fixed-data-table/dist/fixed-data-table.css';

// Panoptes components
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';
import PropertyCell from 'panoptes/PropertyCell';
import PropertyHeader from 'panoptes/PropertyHeader';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';
import DetectResize from 'utils/DetectResize';

// Constants in this component
const MAX_COLOR = Color('#44aafb');
const ROW_HEIGHT = 30;
const HEADER_HEIGHT = 50;
const SCROLLBAR_HEIGHT = 15;

let DataTableView = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'query', 'columns', 'order', 'startRowIndex')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    order: React.PropTypes.array,
    startRowIndex: React.PropTypes.number,
    columns: React.PropTypes.array,
    columnWidths: React.PropTypes.object,
    onColumnResize: React.PropTypes.func,
    onOrderChange: React.PropTypes.func,
    onShowableRowsCountChange: React.PropTypes.func,
    onFetchedRowsCountChange: React.PropTypes.func,
    onTotalRowsCountChange: React.PropTypes.func,
    className: React.PropTypes.string
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
      columnWidths: {},
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

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {table, columns, order, startRowIndex, query} = props;
    let {showableRowsCount} = this.state;
    if (columns.length > 0 && showableRowsCount > 0) {
      this.setState({loadStatus: 'loading'});
      let stopRowIndex = startRowIndex + showableRowsCount - 1;
      let queryAPIargs = {
        database: this.config.dataset,
        table: this.config.tablesById[table].id,
        columns: columns,
        orderBy: order,
        query: this.getDefinedQuery(query, table),
        start: startRowIndex,
        stop: stopRowIndex,
        transpose: true //We want rows, not columns
      };

      let rowsCountAPIargs = {
        database: this.config.dataset,
        table: this.config.tablesById[table].id,
        query: this.getDefinedQuery(query, table),
      };

      requestContext.request((componentCancellation) =>
        Promise.all([
          LRUCache.get(
            'query' + JSON.stringify(queryAPIargs),
            (cacheCancellation) =>
              API.query({cancellation: cacheCancellation, ...queryAPIargs}),
            componentCancellation
          ),
          LRUCache.get(
            'rowsCount' + JSON.stringify(rowsCountAPIargs),
            (cacheCancellation) =>
              API.rowsCount({cancellation: cacheCancellation, ...rowsCountAPIargs}),
            componentCancellation
          )
        ])
      )
      .then(([rows, rowsCount]) => {
        this.setState({
          loadStatus: 'loaded',
          rows: rows,
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

  defaultWidth(columnData) {
    if (columnData.dispDataType == 'Boolean')
      return 75;
    if (columnData.defaultWidth)
      return columnData.defaultWidth;
    if (columnData.isDate)
      return 110;
    if (columnData.decimDigits)
      return Math.max(15 + columnData.decimDigits * 15, 110);
    return 110;
  },

  handleResize(size) {
    this.setState(size);
    this.setShowableRows(size);
  },

  setShowableRows(size) {
    this.setState({showableRowsCount: size.height ? Math.floor((size.height - HEADER_HEIGHT - SCROLLBAR_HEIGHT) / ROW_HEIGHT) : 0});
  },

  componentDidUpdate: function(prevProps, prevState) {
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

  render() {
    let {className, columns, columnWidths, order} = this.props;
    let {loadStatus, rows, width, height} = this.state;
    if (!this.tableConfig()) {
      console.error(`Table ${this.props.table} doesn't exist'`);
      return null;
    }
    if (columns.length > 0)
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
                if (!this.tableConfig().propertiesById[column]) {
                  console.error(`Column ${column} doesn't exist on ${this.props.table}.`);
                  return;
                }
                let columnData = this.tableConfig().propertiesById[column];
                let {id, isPrimKey, description, name} = columnData;
                let asc = _some(order, ([dir, orderCol]) => dir === 'asc' && orderCol === column);
                let desc = _some(order, ([dir, orderCol]) => dir === 'desc' && orderCol === column);
                let width = columnWidths[column] || this.defaultWidth(columnData);
                return <Column
                  //TODO Better default column widths
                  width={width}
                  key={id}
                  columnKey={id}
                  fixed={isPrimKey}
                  allowCellsRecycling={true}
                  isResizable={true}
                  minWidth={50}
                  header={
                    <PropertyHeader
                      className={classNames({
                        'pointer': true,
                        'table-row-header': true,
                        'sort-column-ascending': asc,
                        'sort-column-descending': desc
                      })}
                      style={{width: width}}
                      onClick={() => this.handleOrderChange(id)}
                      prefix={(asc || desc) ?
                        <Icon className="sort" name={asc ? 'sort-amount-asc' : 'sort-amount-desc'}/> :
                        null}
                      name={name}
                      description={description}
                      tooltipPlacement={'bottom'}
                      tooltipTrigger={['click']}/>
                  }
                  cell={({rowIndex}) => {

                    let background = 'inherit';
                    let {maxVal, minVal, valueColours, showBar, alignment} = columnData;
                    let cellData = rows[rowIndex][id];
                    if (showBar && cellData !== null && maxVal !== undefined && minVal !== undefined) {
                      cellData = parseFloat(cellData);
                      let percent = 100 * (cellData - minVal) / (maxVal - minVal);
                      background = `linear-gradient(to right, ${rowIndex % 2 ? 'rgb(115, 190, 252)' : 'rgb(150, 207, 253)'} ${percent}%, rgba(0,0,0,0) ${percent}%`;
                    } else if (cellData !== null && maxVal !== undefined && minVal !== undefined) {
                      let clippedCellData = Math.min(Math.max(parseFloat(cellData), minVal), maxVal);
                      background = _cloneDeep(MAX_COLOR).lighten(0.58 * (1 - (clippedCellData - minVal) / (maxVal - minVal))).rgbString();
                    }
                    if (valueColours) {
                      let col = valueColours[cellData] || valueColours['_other_'];
                      if (col) {
                        col = Color(col).lighten(0.3);
                        if (rowIndex % 2)
                          col.darken(0.1);

                        background = col.rgbString();
                      }
                    }

                    return (
                        <div className="table-row-cell"
                                        style={{
                                          textAlign: alignment,
                                          width: width,
                                          height: ROW_HEIGHT + 'px',
                                          background: background
                                        }}>
                          <PropertyCell prop={columnData} value={cellData}/>
                        </div>
                  );
                  }}
                />;
              })
              }
            </Table>
            <Loading status={loadStatus}/>
          </div>
        </DetectResize>
      );
    else
      return (
        <div className={classNames('load-container', className)}>
          <Loading status="custom">No columns selected</Loading>
        </div>
      );
  }

});

export default DataTableView;
