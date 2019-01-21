import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import classNames from 'classnames';
import Color from 'color';
import {Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@material-ui/core';

// Lodash
import _uniq from 'lodash.uniq';
import _some from 'lodash.some';
import _forEach from 'lodash.foreach';
import _filter from 'lodash.filter';
import _map from 'lodash.map';
import _orderBy from 'lodash.orderby';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes components
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';
import PropertyCell from 'panoptes/PropertyCell';
import PropertyHeader from 'panoptes/PropertyHeader';
import DataTableWithActions from 'containers/DataTableWithActions';
import Icon from 'ui/Icon';
import Loading from 'ui/Loading';

const MAX_COLOR = Color('#44aafb');
const MAX_DISPLAY_DATA_POINTS = 100000;

// TODO: global agreement on null (Formatter.js ?)
function isNull(value) {
  // NB: Number.isNaN() is different to isNaN()
  return value === undefined || value === null || value === 'NULL' || value === '' || Number.isNaN(value) ? true : false;
}

let PivotTableView = createReactClass({
  displayName: 'PivotTableView',

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
      'rowSortOrder',
      'display'
    )
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    query: PropTypes.string,
    columnSortOrder: PropTypes.array,
    rowSortOrder: PropTypes.array,
    onOrderChange: PropTypes.func,
    columnProperty: PropTypes.string,
    rowProperty: PropTypes.string,
    className: PropTypes.string,
    style: PropTypes.object,
    height: PropTypes.string,
    display: PropTypes.string,
    hasClickableCells: PropTypes.bool
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined,
      columnSortOrder: [],
      rowSortOrder: [],
      hasClickableCells: true
    };
  },

  getInitialState() {
    return {
      uniqueColumns: [],
      uniqueRows: [],
      loadStatus: 'loaded',
      loadStatusContent: null
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
      display
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
        loadStatusContent: null,
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
      columns,
      query: this.getDefinedQuery(query, table),
      orderBy: order,
      groupBy,
      transpose: false
    };

    requestContext.request((componentCancellation) =>
      LRUCache.get(
        `query${JSON.stringify(queryAPIargs)}`,
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

        // Don't show the data if it might jeopardize the browser's memory.
        let dataPointsCount = null;
        if (uniqueColumns.length > 0 && uniqueRows.length > 0) {
          dataPointsCount = uniqueColumns.length * uniqueRows.length;
        } else if (uniqueColumns.length > 0 && uniqueRows.length === 0) {
          dataPointsCount = uniqueColumns.length;
        } else if (uniqueColumns.length === 0 && uniqueRows.length > 0) {
          dataPointsCount = uniqueRows.length;
        } else {
          dataPointsCount = 0;
        }
        if (dataPointsCount > MAX_DISPLAY_DATA_POINTS) {
          this.setState({
            loadStatus: 'custom',
            loadStatusContent: <div>You have asked to display {dataPointsCount.toLocaleString()} data points, which is more than our current limit of {MAX_DISPLAY_DATA_POINTS.toLocaleString()}. Please use a stricter filter, or contact us directly.</div>
          });
          return;
        }

        // Make null headings consistently 'NULL'
        uniqueColumns = _map(uniqueColumns, (heading) => isNull(heading) ? '__NULL__' : heading).sort();
        uniqueRows = _map(uniqueRows, (heading) => isNull(heading) ? '__NULL__' : heading).sort();

        // Add the '_all_' headings
        uniqueColumns.unshift('_all_');
        uniqueRows.unshift('_all_');

        let dataByColumnRow = {};

        // For each unique column initialize the aggregate count value of all rows in that column to 0.
        uniqueColumns.forEach(
          (columnValue) => dataByColumnRow[columnValue] = {'_all_': {count: 0}}
        );

        // For each unique row initialize the aggregate count value of all columns in that row to 0.
        uniqueRows.forEach(
          (rowValue) => dataByColumnRow['_all_'][rowValue] = {count: 0}
        );

        for (let i = 0, len = countData.length; i < len; ++i) {

          dataByColumnRow['_all_']['_all_'].count += countData[i];

          // Make null data consistently 'NULL'
          let nulledColumnDatum = undefined;
          let nulledRowDatum = undefined;

          if (columnProperty) {
            nulledColumnDatum = isNull(columnData[i]) ? '__NULL__' : columnData[i];
            dataByColumnRow[nulledColumnDatum]['_all_'].count += countData[i];
          }
          if (rowProperty) {
            nulledRowDatum = isNull(rowData[i]) ? '__NULL__' : rowData[i];
            dataByColumnRow['_all_'][nulledRowDatum].count += countData[i];
          }
          if (columnProperty && rowProperty) {
            dataByColumnRow[nulledColumnDatum][nulledRowDatum] = {count: countData[i]};
          }

        }

        function calcPercentageData(dataObject, totalCount) {
          if (dataObject !== undefined) {
            let percentage = ((dataObject.count / totalCount) * 100).toFixed(0);
            dataObject.backgroundColor = Color(MAX_COLOR).lighten(0.58 * (1 - (percentage - 0) / 100)).string();
            dataObject.displayValue = `${percentage}%`;
            dataObject.sortValue = percentage;
            return dataObject;
          } else {
            return {displayValue: '', sortValue: ''};
          }
        }

        switch (display) {

        // Show raw counts.
        case undefined:
        case 'counts': {
          uniqueColumns.forEach(
            (columnValue) => {
              uniqueRows.forEach(
                (rowValue) => {
                  if (dataByColumnRow[columnValue][rowValue] !== undefined) {
                    dataByColumnRow[columnValue][rowValue].displayValue = dataByColumnRow[columnValue][rowValue].count;
                    dataByColumnRow[columnValue][rowValue].sortValue = dataByColumnRow[columnValue][rowValue].count;
                    return;
                  } else {
                    return dataByColumnRow[columnValue][rowValue] = {displayValue: '', sortValue: 0};
                  }
                }
              );
            }
          );
          break;
        }
        case 'percentAll': {
          const totalCount = dataByColumnRow['_all_']['_all_'].count;
          uniqueColumns.forEach(
            (columnValue) => {
              uniqueRows.forEach(
                (rowValue) => dataByColumnRow[columnValue][rowValue] = calcPercentageData(dataByColumnRow[columnValue][rowValue], totalCount)
              );
            }
          );
          break;
        }
        case 'percentColumn': {
          uniqueColumns.forEach(
            (columnValue) => {
              let columnTotalCount = dataByColumnRow[columnValue]['_all_'].count;
              uniqueRows.forEach(
                (rowValue) => dataByColumnRow[columnValue][rowValue] = calcPercentageData(dataByColumnRow[columnValue][rowValue], columnTotalCount)
              );
            }
          );
          break;
        }
        case 'percentRow': {
          uniqueRows.forEach(
            (rowValue) => {
              let rowTotalCount = dataByColumnRow['_all_'][rowValue].count;
              uniqueColumns.forEach(
                (columnValue) => dataByColumnRow[columnValue][rowValue] = calcPercentageData(dataByColumnRow[columnValue][rowValue], rowTotalCount)
              );
            }
          );
          break;
        }
        default: {
          console.error('Unhandled value for display prop: %o', display);
        }
        }


        if (columnSortOrder && columnSortOrder.length) {
          uniqueRows = _orderBy(uniqueRows,
            _map(columnSortOrder, ([dir, heading]) => (row) => Number(dataByColumnRow[heading][row].sortValue)),
            _map(columnSortOrder, ([dir, heading]) => dir));
        }

        if (rowSortOrder && rowSortOrder.length) {
          uniqueColumns = _orderBy(uniqueColumns,
            _map(rowSortOrder, ([dir, heading]) => (col) => Number(dataByColumnRow[col][heading].sortValue)),
            _map(rowSortOrder, ([dir, heading]) => dir));
        }


        this.setState({
          loadStatus: 'loaded',
          loadStatusContent: null,
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
        this.setState({
          loadStatus: 'error',
          loadStatusContent: null,
        });
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
      console.error(`Unhandled order axis: ${axis}`);
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

  handleOpenTableForCell(rowValue, columnValue) {

    if (rowValue == undefined || columnValue == undefined) {
      return;
    }

    let {table, columnProperty, rowProperty, query} = this.props;

    let nullifiedRowValue = rowValue == '__NULL__' ? null : rowValue;
    let nullifiedColumnValue = columnValue == '__NULL__' ? null : columnValue;

    let rowValueClause = SQL.WhereClause.CompareFixed(rowProperty, '=', nullifiedRowValue);
    let columnValueClause = SQL.WhereClause.CompareFixed(columnProperty, '=', nullifiedColumnValue);

    let tableCellQuery = undefined;
    if (rowValue !== '_all_' && columnValue !== '_all_') {
      tableCellQuery = SQL.WhereClause.Compound('AND');
      tableCellQuery.addComponent(rowValueClause);
      tableCellQuery.addComponent(columnValueClause);
    } else if (columnValue !== '_all_') {
      tableCellQuery = columnValueClause;
    } else if (rowValue !== '_all_') {
      tableCellQuery = rowValueClause;
    }

    let encodedTableCellQuery = undefined;
    if (tableCellQuery !== undefined) {
      let baseQueryDecoded = SQL.WhereClause.decode(query);
      if (baseQueryDecoded.isTrivial) {
        encodedTableCellQuery = SQL.WhereClause.encode(tableCellQuery);
      } else {
        let newAND = SQL.WhereClause.Compound('AND');
        newAND.addComponent(baseQueryDecoded);
        newAND.addComponent(tableCellQuery);
        encodedTableCellQuery = SQL.WhereClause.encode(newAND);
      }
    } else {
      encodedTableCellQuery = query;
    }

    if (encodedTableCellQuery == undefined) {
      console.error('Unhandled logic. rowValue: %o, columnValue: %o', rowValue, columnValue);
    }

    this.getFlux().actions.session.popupOpen(<DataTableWithActions table={table} query={encodedTableCellQuery} sidebar={false} />);
  },

  render() {
    let {className, height, columnProperty, rowProperty, columnSortOrder, rowSortOrder, table, hasClickableCells} = this.props;
    let {uniqueRows, uniqueColumns, dataByColumnRow, loadStatus, loadStatusContent} = this.state;
    if (!this.tableConfig()) {
      console.error(`Table ${this.props.table} doesn't exist'`);
      return null;
    }

    let tableOnCellClick = null;
    if (hasClickableCells) {
      tableOnCellClick = (rowNumber, columnId) => {
        this.handleOpenTableForCell(uniqueRows[rowNumber], uniqueColumns[columnId]);
      };
    }

    if (loadStatus === 'loaded') {
      return (
        <Table
          className={className}
          height={height}
        >
          <TableHead>
            <TableRow style={{height: '20px'}}>
              <TableCell style={{border: 'none'}}>&#8203;</TableCell>
              <TableCell style={{border: 'none'}}>
                {columnProperty ? <PropertyHeader className="table-row-header" style={{display: 'flex', justifyContent: 'flex-start', height: '20px'}} table={table} propId={columnProperty} tooltipPlacement={'bottom'} tooltipTrigger={['click']}/> : ''}
              </TableCell>
            </TableRow>
            <TableRow style={{height: '20px'}}>
              <TableCell style={{overflow: 'hidden'}}>
                {rowProperty ? <PropertyHeader className="table-row-header"  style={{display: 'flex', justifyContent: 'flex-start', height: '20px'}} table={table} propId={rowProperty} tooltipPlacement={'bottom'} tooltipTrigger={['click']}/> : ''}
              </TableCell>
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
                let columnHeadingDisplayValue = columnHeading;
                let noFormatting = false;
                if (columnHeading == '_all_') {
                  columnHeadingDisplayValue = 'All columns';
                  noFormatting = true;
                } else if (columnHeading === '__NULL__') {
                  columnHeadingDisplayValue = 'NULL';
                  noFormatting = true;
                }
                return (
                  <TableCell
                    key={columnHeading}
                    style={{cursor: 'pointer'}}
                    onClick={() => this.handleOrderChange('column', columnHeading)}
                  >
                    <PropertyCell
                      className={classNames({
                        'table-row-cell': true,
                        'pointer': true,
                        'table-row-header': true,
                        'sort-column-ascending': asc,
                        'sort-column-descending': desc
                      })}
                      style={{
                        background,
                        boxShadow: 'none'
                      }}
                      prefix={icon}
                      prop={colPropConfig}
                      value={columnHeadingDisplayValue}
                      noFormatting={noFormatting}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {uniqueRows.map((rowHeading, i) => {
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
              let icon = (asc || desc) ? <Icon style={{fontSize: '1em', marginRight: '3px', transform: 'rotate(-90deg)'}} className="sort"
                name={asc ? 'sort-amount-asc' : 'sort-amount-desc'}/> : null;
              let rowHeadingDisplayValue = rowHeading;
              let noFormatting = false;
              if (rowHeading == '_all_') {
                rowHeadingDisplayValue = 'All rows';
                noFormatting = true;
              } else if (rowHeading === '__NULL__') {
                rowHeadingDisplayValue = 'NULL';
                noFormatting = true;
              }
              return (
                <TableRow key={rowHeading} hover>
                  <TableCell
                    key={rowHeading}
                    style={{cursor: 'pointer'}}
                    onClick={() => this.handleOrderChange('row', rowHeading)}
                  >
                    <PropertyCell
                      className={classNames({
                        'table-row-cell': true,
                        'pointer': true,
                        'table-row-header': true,
                        'sort-column-ascending': asc,
                        'sort-column-descending': desc
                      })}
                      style={{
                        background,
                        boxShadow: 'none',
                      }}
                      prefix={icon}
                      prop={rowPropConfig}
                      value={rowHeadingDisplayValue}
                      noFormatting={noFormatting}
                    />
                  </TableCell>
                  {uniqueColumns.map((columnHeading, j) =>
                    <TableCell
                      key={columnHeading}
                      style={{cursor: hasClickableCells ? 'pointer' : 'inherit', backgroundColor: dataByColumnRow[columnHeading][rowHeading].backgroundColor}}
                      onClick={() => tableOnCellClick(i, j)}
                      title={hasClickableCells ? 'Click to open the table for this cell' : null}
                    >
                      {dataByColumnRow[columnHeading][rowHeading].displayValue.toLocaleString()}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      );
    } else {
      return (
        <div className={classNames('load-container', className)}>
          <Loading status={loadStatus}>{loadStatusContent}</Loading>
        </div>
      );
    }

  },
});

export default PivotTableView;
