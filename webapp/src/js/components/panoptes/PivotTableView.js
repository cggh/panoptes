import React from 'react';
import classNames from 'classnames';
import Color from 'color';

// Lodash
import _uniq from 'lodash/uniq';
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

let PivotTableView = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'query', 'columnProperty', 'rowProperty', 'order')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    order: React.PropTypes.array,
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
      order: []
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
    let {table, columnProperty, rowProperty, query, order} = props;

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
    this.setState({loadStatus: 'loading', dataByColumnRow: null, uniqueColumns: [], uniqueRows: []});

    let queryAPIargs = {
      database: this.config.dataset,
      table: this.config.tablesById[table].id,
      columns: columns,
      query: this.getDefinedQuery(query, table),
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
        let uniqueColumns = ['_all_'].concat(columnData ? _uniq(columnData) : []);
        let uniqueRows = ['_all_'].concat(rowData ? _uniq(rowData) : []);
        let dataByColumnRow = {};
        uniqueColumns.forEach((columnValue) => dataByColumnRow[columnValue] = {'_all_': 0});
        dataByColumnRow['_all_'] = {};
        uniqueRows.forEach((rowValue) => dataByColumnRow['_all_'][rowValue] = 0);
        for (let i = 0; i < countData.length; ++i) {
          dataByColumnRow['_all_']['_all_'] += countData[i];
          if (columnProperty) {
            dataByColumnRow[columnData[i]]['_all_'] += countData[i];
          }
          if (rowProperty) {
            dataByColumnRow['_all_'][rowData[i]] += countData[i];
          }
          if (columnProperty && rowProperty) {
            dataByColumnRow[columnData[i]][rowData[i]] = countData[i];
          }
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
        ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
        this.setState({loadStatus: 'error'});
      })
      .done();
  },

  handleResize(size) {
    this.setState(size);
  },

  handleOrderChange(column) {
    let currentOrder = this.props.order;
    // Choose the sort direction based on whether this column is already in the order array.
    let newDirection = 'asc';
    _forEach(currentOrder, ([direction, orderCol]) => {
      if (orderCol === column) {
        newDirection = {asc: 'desc', desc: null}[direction];
      }
    });
    //Remove this column from the sort order
    currentOrder = _filter(currentOrder, ([direction, orderCol]) => orderCol !== column);
    //Then add it to the end (if needed)
    if (newDirection) {
      currentOrder.push([newDirection, column]);
    }
    if (this.props.onOrderChange) {
      this.props.onOrderChange(currentOrder);
    }
  },

  render() {
    let {className, columnProperty, rowProperty, order} = this.props;
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
                const value = uniqueRows[rowIndex];
                const rowPropConfig = this.tableConfig().propertiesById[rowProperty] || {};
                const valueColours = rowPropConfig.valueColours;
                let background = 'inherit';
                if (valueColours && value !== '_all_') {
                  let col = valueColours[value] || valueColours['_other_'];
                  if (col) {
                    background = Color(col).lighten(0.3).rgbString();
                  }
                }
                return <div className="table-row-cell"
                     style={{
                       textAlign: value == '_all_' ? 'center' : rowPropConfig.alignment,
                       width: COLUMN_WIDTH,
                       height: ROW_HEIGHT + 'px',
                       background: background
                     }}>
                  {
                    uniqueRows[rowIndex] == '_all_' ? 'All' :
                      <PropertyCell prop={rowPropConfig} value={value}/>
                  }
                </div>;
              }}
            />
            {uniqueColumns.map((columnValue) => {
              const colPropConfig = this.tableConfig().propertiesById[columnProperty] || {};
              const valueColours = colPropConfig.valueColours;
              let background = 'inherit';
              if (valueColours && columnValue !== '_all_') {
                let col = valueColours[columnValue] || valueColours['_other_'];
                if (col) {
                  background = Color(col).lighten(0.3).rgbString();
                }
              }

              let asc = _some(order, ([dir, orderCol]) => dir === 'asc' && orderCol === columnValue);
              let desc = _some(order, ([dir, orderCol]) => dir === 'desc' && orderCol === columnValue);
              let icon = (asc || desc) ? <Icon className="sort" name={asc ? 'sort-amount-asc' : 'sort-amount-desc'}/> : null;

              return <Column
              //TODO Better default column widths
              width={COLUMN_WIDTH}
              key={columnValue}
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
                onClick={() => this.handleOrderChange(columnValue)}
                style={{
                  textAlign: columnValue == '_all_' ? 'center' : colPropConfig.alignment,
                  width: COLUMN_WIDTH,
                  height: HEADER_HEIGHT + 'px',
                  background: background
                }}
                >
                  {icon}
                  { columnValue == '_all_' ? 'All' : <PropertyCell prop={colPropConfig} value={columnValue}/> }
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
                      {(dataByColumnRow[columnValue][uniqueRows[rowIndex]] || '').toLocaleString()}
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
