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

import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn
} from 'material-ui/Table';
// Panoptes components
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';
import PropertyCell from 'panoptes/PropertyCell';
import PropertyHeader from 'panoptes/PropertyHeader';

// UI components
import Icon from 'ui/Icon';

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
    className: React.PropTypes.string,
    style: React.PropTypes.object,
    height: React.PropTypes.string,
    percentage: React.PropTypes.string
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
      rowSortOrder,
      percentage
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
        uniqueColumns = _map(uniqueColumns, (heading) => isNull(heading) ? '__NULL__' : heading);
        uniqueRows = _map(uniqueRows, (heading) => isNull(heading) ? '__NULL__' : heading);

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

        for (let i = 0, len = countData.length; i < len; ++i) {
          dataByColumnRow['_all_']['_all_'] += countData[i];

          // Make null data consistently 'NULL'
          let nulledColumnDatum = undefined;
          let nulledRowDatum = undefined;

          if (columnProperty) {
            nulledColumnDatum = isNull(columnData[i]) ? '__NULL__' : columnData[i];
            dataByColumnRow[nulledColumnDatum]['_all_'] += countData[i];
          }
          if (rowProperty) {
            nulledRowDatum = isNull(rowData[i]) ? '__NULL__' : rowData[i];
            dataByColumnRow['_all_'][nulledRowDatum] += countData[i];
          }
          if (columnProperty && rowProperty) {
            dataByColumnRow[nulledColumnDatum][nulledRowDatum] = countData[i];
          }
        }

        switch (percentage) {
          case undefined: {
            // No op. Show raw counts.
            break;
          }
          case 'All': {
            let totalCount = dataByColumnRow['_all_']['_all_'];
            uniqueColumns.forEach(
              (columnValue) => {
                uniqueRows.forEach(
                  (rowValue) => {
                    if (dataByColumnRow[columnValue][rowValue] !== undefined) {
                      return dataByColumnRow[columnValue][rowValue] = '' + ((dataByColumnRow[columnValue][rowValue] / totalCount) * 100).toFixed(0) + '%';
                    }
                  }
                );
              }
            );
            break;
          }
          case 'Column': {
            uniqueColumns.forEach(
              (columnValue) => {
                let columnTotalCount = dataByColumnRow[columnValue]['_all_'];
                uniqueRows.forEach(
                  (rowValue) => {
                    if (dataByColumnRow[columnValue][rowValue] !== undefined) {
                      return dataByColumnRow[columnValue][rowValue] = '' + ((dataByColumnRow[columnValue][rowValue] / columnTotalCount) * 100).toFixed(0) + '%';
                    }
                  }
                );
              }
            );
            break;
          }
          case 'Row': {
            uniqueRows.forEach(
              (rowValue) => {
                let rowTotalCount = dataByColumnRow['_all_'][rowValue];
                uniqueColumns.forEach(
                  (columnValue) => {
                    if (dataByColumnRow[columnValue][rowValue] !== undefined) {
                      return dataByColumnRow[columnValue][rowValue] = '' + ((dataByColumnRow[columnValue][rowValue] / rowTotalCount) * 100).toFixed(0) + '%';
                    }

                  }
                );
              }
            );
            break;
          }
          default: {
            console.error('Unhandled value for percentage prop: %o', percentage);
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
    let {style, className, height, columnProperty, rowProperty, columnSortOrder, rowSortOrder, table} = this.props;
    let {uniqueRows, uniqueColumns, dataByColumnRow} = this.state;
    if (!this.tableConfig()) {
      console.error(`Table ${this.props.table} doesn't exist'`);
      return null;
    }
    //style={style} className={classNames('load-container', className)}
    return (
        <Table wrapperStyle={style} classname={className} height={height}>
          <TableHeader
            adjustForCheckbox={false}
            displaySelectAll={false}

          >
            <TableRow>
              <TableHeaderColumn style={{overflow: 'hidden'}}>
                <div>
                  {columnProperty ? <PropertyHeader className="table-row-header" style={{display: 'flex', justifyContent: 'flex-end'}} table={table} propId={columnProperty} tooltipPlacement={'bottom'} tooltipTrigger={['click']}/> : ''}
                </div>
                <div>
                  {rowProperty ? <PropertyHeader className="table-row-header"  style={{display: 'flex', justifyContent: 'flex-start'}} table={table} propId={rowProperty} tooltipPlacement={'bottom'} tooltipTrigger={['click']}/> : ''}
                </div>
              </TableHeaderColumn>
              {uniqueColumns.map((columnHeading) => {
                const colPropConfig = this.tableConfig().propertiesById[columnProperty] || {};
                const valueColours = colPropConfig.valueColours;
                let background = 'inherit';
                if (valueColours && columnHeading !== '_all_') {
                  let col = valueColours[columnHeading] || valueColours['_other_'];
                  if (col) {
                    background = Color(col).lighten(0.3).string();
                  }
                }

                let asc = _some(columnSortOrder, ([dir, val]) => dir === 'asc' && val === columnHeading);
                let desc = _some(columnSortOrder, ([dir, val]) => dir === 'desc' && val === columnHeading);
                let icon = (asc || desc) ? <Icon style={{fontSize: '1em', marginRight: '3px'}} className="sort"
                                                 name={asc ? 'sort-amount-asc' : 'sort-amount-desc'}/> : null;
                return (
                  <TableHeaderColumn
                    key={columnHeading}>
                    { columnHeading == '_all_' ?
                      'All' :
                      <PropertyCell
                        className={classNames({
                          'table-row-cell': true,
                          'pointer': true,
                          'table-row-header': true,
                          'sort-column-ascending': asc,
                          'sort-column-descending': desc
                        })}
                        style={{
                          // textAlign: columnHeading == '_all_' ? 'center' : colPropConfig.alignment,
                          background: background
                        }}
                        onClick={() => this.handleOrderChange('column', columnHeading)}
                        prefix={icon}
                        prop={colPropConfig}
                        value={columnHeading === '__NULL__' ? null : columnHeading}/>}
                  </TableHeaderColumn>);
              })}
            </TableRow>
          </TableHeader>
          <TableBody
            displayRowCheckbox={false}
            showRowHover={true}
          >
            {uniqueRows.map((rowHeading) => {
              const rowPropConfig = this.tableConfig().propertiesById[rowProperty] || {};
              const valueColours = rowPropConfig.valueColours;
              let background = 'inherit';
              if (valueColours && rowHeading !== '_all_') {
                let col = valueColours[rowHeading] || valueColours['_other_'];
                if (col) {
                  background = Color(col).lighten(0.3).string();
                }
              }

              let asc = _some(rowSortOrder, ([dir, val]) => dir === 'asc' && val === rowHeading);
              let desc = _some(rowSortOrder, ([dir, val]) => dir === 'desc' && val === rowHeading);
              let icon = (asc || desc) ? <Icon style={{fontSize: '1em', marginRight: '3px'}} className="sort"
                                               name={asc ? 'sort-amount-asc' : 'sort-amount-desc'}/> : null;
              return (
                <TableRow key={rowHeading}>
                  <TableHeaderColumn
                    key={rowHeading}>
                    { rowHeading == '_all_' ?
                      'All' :
                      <PropertyCell
                        className={classNames({
                          'table-row-cell': true,
                          'pointer': true,
                          'table-row-header': true,
                          'sort-column-ascending': asc,
                          'sort-column-descending': desc
                        })}
                        style={{
                          // textAlign: rowHeading == '_all_' ? 'center' : rowPropConfig.alignment,
                          background: background
                        }}
                        onClick={() => this.handleOrderChange('row', rowHeading)}
                        prefix={icon}
                        prop={rowPropConfig}
                        value={rowHeading === '__NULL__' ? null : rowHeading}/>}
                  </TableHeaderColumn>
                  {uniqueColumns.map((columnHeading) =>
                      <TableRowColumn>
                        {(dataByColumnRow[columnHeading][rowHeading] || '').toLocaleString()}
                      </TableRowColumn>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
    );
    //

  }
});

export default PivotTableView;
