import React from 'react';
import classNames from 'classnames';
import Color from 'color';

// Lodash
import _uniq from 'lodash/uniq';
import _some from 'lodash/some';
import _forEach from 'lodash/forEach';
import _filter from 'lodash/filter';
import _map from 'lodash/map';
import _orderBy from 'lodash/orderBy';

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

// UI components
import Loading from 'ui/Loading';
import DetectResize from 'utils/DetectResize';
import Icon from 'ui/Icon';

// Constants in this component
// const MAX_COLOR = Color('#44aafb');
const ROW_HEIGHT = 30;
const HEADER_HEIGHT = 50;
// const SCROLLBAR_HEIGHT = 15;
const COLUMN_WIDTH = 120;

// TODO: global agreement on null (Formatter.js ?)
function isNull(value) {
  // NB: Number.isNaN() is different to isNaN()
  return value === undefined || value === null || value === 'NULL' || value === '' || Number.isNaN(value) ? true : false;
}

let PivotTableView = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin(
      'table',
      'query',
      'columnProperty',
      'rowProperty',
      'columnSortOrder',
      'rowSortOrder'
    )
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    columnSortOrder: React.PropTypes.array,
    rowSortOrder: React.PropTypes.array,
    onOrderChange: React.PropTypes.func,
    columnProperty: React.PropTypes.string,
    rowProperty: React.PropTypes.string,
    className: React.PropTypes.string
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined,
      columnSortOrder: [],
      rowSortOrder: []
    };
  },

  getInitialState() {
    return {
      uniqueColumns: [],
      uniqueRows: [],
      loadStatus: 'loaded',
      width: 0,
      height: 0,
    };
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {
      table,
      columnProperty,
      rowProperty,
      query,
      columnSortOrder,
      rowSortOrder
    } = props;

    let columns = [
      {expr: ['count', ['*']], as: 'count'}
    ];
    let groupBy = [];
    if (columnProperty) {
      columns.push(columnProperty);
      groupBy.push(columnProperty);
    }
    if (rowProperty) {
      columns.push(rowProperty);
      groupBy.push(rowProperty);
    }
    columns = _uniq(columns);
    groupBy = _uniq(groupBy);
    this.setState(
      {
        loadStatus: 'loading',
        dataByColumnRow: null,
        uniqueColumns: [],
        uniqueRows: []
      }
    );

    let order = [];
    if (columnProperty) {
      order.push(['asc', columnProperty]);
    }
    if (rowProperty) {
      order.push(['asc', rowProperty]);
    }
    let queryAPIargs = {
      database: this.config.dataset,
      table: this.config.tablesById[table].id,
      columns: columns,
      query: this.getDefinedQuery(query, table),
      orderBy: order,
      groupBy,
      start: 0,
      stop: 1000,
      transpose: false
    };

    requestContext.request((componentCancellation) =>
      LRUCache.get(
        'query' + JSON.stringify(queryAPIargs),
        (cacheCancellation) =>
          API.query({cancellation: cacheCancellation, ...queryAPIargs}),
        componentCancellation
      )
    )
      .then((data) => {

        let columnData = data[columnProperty];
        let rowData = data[rowProperty];
        let countData = data['count'];

        let uniqueColumns = columnData ? _uniq(columnData) : [];
        let uniqueRows = rowData ? _uniq(rowData) : [];

        // Make null headings consistently 'NULL'
        uniqueColumns = _map(uniqueColumns, (heading) => isNull(heading) ? 'NULL' : heading);
        uniqueRows = _map(uniqueRows, (heading) => isNull(heading) ? 'NULL' : heading);

        // Add the '_all_' headings
        uniqueColumns.unshift('_all_');
        uniqueRows.unshift('_all_');

        let dataByColumnRow = {};
        uniqueColumns.forEach(
          (columnValue) => dataByColumnRow[columnValue] = {'_all_': 0}
        );
        dataByColumnRow['_all_'] = {};
        uniqueRows.forEach(
          (rowValue) => dataByColumnRow['_all_'][rowValue] = 0
        );

        for (let i = 0; i < countData.length; ++i) {
          dataByColumnRow['_all_']['_all_'] += countData[i];

          // Make null data consistently 'NULL'
          let nulledColumnDatum = undefined;
          let nulledRowDatum = undefined;

          if (columnProperty) {
            nulledColumnDatum = isNull(columnData[i]) ? 'NULL' : columnData[i];
            dataByColumnRow[nulledColumnDatum]['_all_'] += countData[i];
          }
          if (rowProperty) {
            nulledRowDatum = isNull(rowData[i]) ? 'NULL' : rowData[i];
            dataByColumnRow['_all_'][nulledRowDatum] += countData[i];
          }
          if (columnProperty && rowProperty) {
            dataByColumnRow[nulledColumnDatum][nulledRowDatum] = countData[i];
          }
        }

        if (columnSortOrder && columnSortOrder.length) {
          uniqueRows = _orderBy(uniqueRows,
            _map(columnSortOrder, ([dir, heading]) => (row) => dataByColumnRow[heading][row]),
            _map(columnSortOrder, ([dir, heading]) => dir));
        }

        if (rowSortOrder && rowSortOrder.length) {
          uniqueColumns = _orderBy(uniqueColumns,
            _map(rowSortOrder, ([dir, heading]) => (col) => dataByColumnRow[col][heading]),
            _map(rowSortOrder, ([dir, heading]) => dir));
        }


        this.setState({
          loadStatus: 'loaded',
          uniqueRows,
          uniqueColumns,
          dataByColumnRow
        });
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((xhr) => {
        ErrorReport(
          this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props)
        );
        this.setState({loadStatus: 'error'});
      })
      .done();
  },

  handleResize(size) {
    this.setState(size);
  },

  handleOrderChange(axis, heading) {

    let currentOrder = undefined;

    if (axis === 'column') {
      currentOrder = this.props.columnSortOrder;
    } else if (axis === 'row') {
      currentOrder = this.props.rowSortOrder;
    } else {
      console.error('Unhandled order axis: ' + axis);
      return;
    }

    // Choose the sort direction
    // based on whether this value is already in the array.
    let newDirection = 'asc';
    _forEach(currentOrder, ([dir, val]) => {
      if (val === heading) {
        newDirection = {asc: 'desc', desc: null}[dir];
      }
    });
    //Remove this value from the array
    currentOrder = _filter(currentOrder, ([dir, val]) => val !== heading);
    //Then add it to the end (if needed)
    if (newDirection) {
      currentOrder.push([newDirection, heading]);
    }

    if (this.props.onOrderChange) {
      this.props.onOrderChange(axis, currentOrder);
    }

  },


  render() {
    let {className, columnProperty, rowProperty, columnSortOrder, rowSortOrder} = this.props;
    let {loadStatus, uniqueRows, uniqueColumns, dataByColumnRow, width, height} = this.state;
    if (!this.tableConfig()) {
      console.error(`Table ${this.props.table} doesn't exist'`);
      return null;
    }
    return (
      <DetectResize onResize={this.handleResize}>
        <div className={classNames('load-container', className)}>
          <Table
            rowHeight={ROW_HEIGHT}
            rowsCount={uniqueRows.length}
            width={width}
            height={height}
            headerHeight={HEADER_HEIGHT}
            //headerDataGetter={this.headerData}
            //onColumnResizeEndCallback={this.handleColumnResize}
            isColumnResizing={false}
          >
            <Column
              //TODO Better default column widths
              width={COLUMN_WIDTH}
              allowCellsRecycling={true}
              isFixed={true}
              isResizable={false}
              minWidth={50}
              header=""
              cell={({rowIndex}) => {
                const rowHeading = uniqueRows[rowIndex];
                const rowPropConfig = this.tableConfig().propertiesById[rowProperty] || {};
                const valueColours = rowPropConfig.valueColours;
                let background = 'inherit';
                if (valueColours && rowHeading !== '_all_') {
                  let col = valueColours[rowHeading] || valueColours['_other_'];
                  if (col) {
                    background = Color(col).lighten(0.3).rgbString();
                  }
                }

                let asc = _some(rowSortOrder, ([dir, val]) => dir === 'asc' && val === rowHeading);
                let desc = _some(rowSortOrder, ([dir, val]) => dir === 'desc' && val === rowHeading);
                let icon = (asc || desc) ? <Icon style={{fontSize: '1em', marginRight: '2px'}} className="fa-rotate-270 sort" name={asc ? 'sort-amount-asc' : 'sort-amount-desc'}/> : null;

                return <div className="table-row-cell"
                     style={{
                       textAlign: rowHeading == '_all_' ? 'center' : rowPropConfig.alignment,
                       width: COLUMN_WIDTH,
                       height: ROW_HEIGHT + 'px',
                       background: background,
                       fontWeight: 'bold',
                       cursor: 'pointer'
                     }}
                     onClick={() => this.handleOrderChange('row', rowHeading)}
                     >
                  {icon}
                  {
                    uniqueRows[rowIndex] == '_all_' ? 'All' :
                      <PropertyCell prop={rowPropConfig} value={rowHeading}/>
                  }
                </div>;
              }}
            />
            {uniqueColumns.map((columnHeading) => {
              const colPropConfig = this.tableConfig().propertiesById[columnProperty] || {};
              const valueColours = colPropConfig.valueColours;
              let background = 'inherit';
              if (valueColours && columnHeading !== '_all_') {
                let col = valueColours[columnHeading] || valueColours['_other_'];
                if (col) {
                  background = Color(col).lighten(0.3).rgbString();
                }
              }

              let asc = _some(columnSortOrder, ([dir, val]) => dir === 'asc' && val === columnHeading);
              let desc = _some(columnSortOrder, ([dir, val]) => dir === 'desc' && val === columnHeading);
              let icon = (asc || desc) ? <Icon style={{fontSize: '1em', marginRight: '3px'}} className="sort" name={asc ? 'sort-amount-asc' : 'sort-amount-desc'}/> : null;

              return <Column
              //TODO Better default column widths
              width={COLUMN_WIDTH}
              key={columnHeading}
              allowCellsRecycling={true}
              isResizable={false}
              minWidth={50}
              header={
                <div
                  className={classNames({
                    'table-row-cell': true,
                    'pointer': true,
                    'table-row-header': true,
                    'sort-column-ascending': asc,
                    'sort-column-descending': desc
                  })}
                onClick={() => this.handleOrderChange('column', columnHeading)}
                style={{
                  textAlign: columnHeading == '_all_' ? 'center' : colPropConfig.alignment,
                  width: COLUMN_WIDTH,
                  height: HEADER_HEIGHT + 'px',
                  background: background
                }}
                >
                  {icon}
                  { columnHeading == '_all_' ? 'All' : <PropertyCell prop={colPropConfig} value={columnHeading}/> }
                </div>
                }
              cell={({rowIndex}) =>
                    <div className="table-row-cell"
                         style={{
                           textAlign: 'right',
                           width: COLUMN_WIDTH,
                           height: ROW_HEIGHT + 'px',
                           //background: background
                         }}>
                      {(dataByColumnRow[columnHeading][uniqueRows[rowIndex]] || '').toLocaleString()}
                    </div>
                  }
              />;
            })}
          </Table>
          <Loading status={loadStatus}/>
        </div>
      </DetectResize>
    );
  }

});

module.exports = PivotTableView;
