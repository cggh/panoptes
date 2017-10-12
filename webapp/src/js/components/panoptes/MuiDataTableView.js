import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import classNames from 'classnames';
import Color from 'color';
import Tooltip from 'material-ui/Tooltip'; // NOTE: rc-tooltip is incompatible here
import {withStyles} from 'material-ui/styles';
import _forEach from 'lodash.foreach';
import _filter from 'lodash.filter';
import _cloneDeep from 'lodash.clonedeep';
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
} from 'material-ui/Table';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import SQL from 'panoptes/SQL';
import resolveJoins from 'panoptes/resolveJoins';
import withAPIData from 'hoc/withAPIData';
import Loading from 'ui/Loading';
import PropertyCell from 'panoptes/PropertyCell';

// Constants in this component
const MAX_COLOR = Color('#f3a891');

const styles = (theme) => ({
  table: {
    width: 600,
    overflowX: 'auto',
  },
});


let MuiDataTableView = createReactClass({
  displayName: 'MuiDataTableView',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    query: PropTypes.string,
    order: PropTypes.array,
    startRowIndex: PropTypes.number,
    columns: PropTypes.array,
    onOrderChange: PropTypes.func,
    className: PropTypes.string,
    joins: PropTypes.array,
    classes: PropTypes.object,
    config: PropTypes.object, // This will be provided via withAPIData
    data: PropTypes.array // This will be provided via withAPIData
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
      joins: [],
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
      width: 0,
      height: 0,
      totalRowsCount: 0
    };
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

  handleOrderChange(column) {

    let currentOrder = this.props.order;
    //Choose direction based on if this column already in order
    let newDir = 'asc';
    _forEach(currentOrder, ([dir, orderCol]) => {
      if (orderCol === column) {
        newDir = {asc: 'desc', desc: null}[dir];
        // Break loop.
        return false;
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

  render() {
    let {className, columns, order, classes, data} = this.props;
    let {loadStatus} = this.state;

    if (!this.tableConfig()) {
      console.error(`Table ${this.props.table} doesn't exist'`);
      return null;
    }

    if (data === undefined || data === null) {
      return null;
    }

    // Convert order array to sortOrderDirectionByColumnId
    let sortOrderDirectionByColumnId = {};
    for (let i = 0; i < order.length; i++) {
      sortOrderDirectionByColumnId[order[i][1]] = order[i][0];
    }

    const primaryKeyColumnId = this.tableConfig().primKey;

    if (columns.length > 0) {
      return (
        <div className={classNames('load-container', className)} style={{width: 620, overflowX: 'auto'}} >
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                {columns.map((column) => {
                  let columnData = this.propertiesByColumn(column);
                  return (
                    <TableCell
                      key={columnData.id}
                      numeric={columnData.isNumerical}
                      padding={'none'}
                    >
                      <Tooltip title="Sort" placement="bottom-end" enterDelay={300}>
                        <TableSortLabel
                          active={sortOrderDirectionByColumnId[columnData.id] !== undefined ? true : false}
                          direction={sortOrderDirectionByColumnId[columnData.id]}
                          onClick={() => this.handleOrderChange(columnData.id)}
                        >
                          {columnData.name}
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                  );
                }, this)}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, rowIndex) =>
                <TableRow
                  hover
                  key={row[primaryKeyColumnId]}
                >
                  {columns.map((column) => {
                    const columnData = this.propertiesByColumn(column);
                    const key = row[primaryKeyColumnId] + '_' + columnData.id;

                    ////////////////////
                    // FIXME: cell background conflicts with row hover highlight
                    let background = 'inherit';
                    let {maxVal, minVal, valueColours, showBar, alignment} = columnData;
                    let cellData = row[columnData.id];
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
                    ///////////////////////

                    return (
                      <TableCell
                        key={key}
                        numeric={columnData.isNumerical}
                        padding={'none'}
                        style={{
                          textAlign: alignment,
                        }}
                      >
                        <PropertyCell prop={columnData} value={cellData}/>
                      </TableCell>
                    );
                  }, this)}
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Loading status={loadStatus}/>
        </div>
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


MuiDataTableView = withAPIData(MuiDataTableView, ({config, props}) => {
  // DataFetcherMixin('table', 'query', 'columns', 'order', 'startRowIndex', 'joins')

  let {table, columns, order, startRowIndex, query, maxRowsPerPage, joins} = props;

  query = query || (table ? config.tablesById[table].defaultQuery : null) || SQL.nullQuery;

  let stopRowIndex = undefined;
  if (maxRowsPerPage !== undefined && maxRowsPerPage > 0) {
    stopRowIndex = startRowIndex + maxRowsPerPage - 1;
  } else {
    stopRowIndex = undefined;
  }

  // FIXME: What is this for?
  let fetchStartRowIndex = startRowIndex !== undefined ? Math.floor(startRowIndex / 100) * 100 : undefined;
  let fetchStopRowIndex = stopRowIndex !== undefined ? (Math.floor(stopRowIndex / 100) + 1) * 100 : undefined;

  return {
    data: {
      method: 'query',
      args: resolveJoins({
        database: config.dataset,
        table,
        columns,
        query,
        transpose: true,
        start: fetchStartRowIndex,
        stop: fetchStopRowIndex,
        joins,
        orderBy: order
      }, config)
    }
  };

});

let module = withStyles(styles)(MuiDataTableView);
module.displayName = 'MuiDataTableView';
export default module;
