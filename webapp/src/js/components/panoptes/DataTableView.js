import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import classNames from 'classnames';
import Color from 'color';

// Lodash
import _throttle from 'lodash/throttle';
import _cloneDeep from 'lodash/cloneDeep';

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
    DataFetcherMixin('table', 'query', 'columns', 'order', 'ascending', 'startRowIndex')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    order: React.PropTypes.string,
    ascending: React.PropTypes.bool,
    startRowIndex: React.PropTypes.number,
    columns: ImmutablePropTypes.listOf(React.PropTypes.string),
    columnWidths: ImmutablePropTypes.mapOf(React.PropTypes.number),
    maxRowsCount: React.PropTypes.number,
    onColumnResize: React.PropTypes.func,
    onOrderChange: React.PropTypes.func,
    onShowableRowsCountChange: React.PropTypes.func,
    onFetchedRowsCountChange: React.PropTypes.func,
    onTotalTruncatedRowsCountChange: React.PropTypes.func,
    className: React.PropTypes.string
  },


  getDefaultProps() {
    return {
      table: null,
      query: SQL.nullQuery,
      order: null,
      ascending: true,
      startRowIndex: 0,
      columns: Immutable.List(),
      columnWidths: Immutable.Map(),
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
      width: 0,
      height: 0,
      showableRowsCount: 0,
      totalTruncatedRowsCount: 0
    };
  },

  componentDidMount() {
    this.setShowableRows = _throttle(this.setShowableRows, 500);
  },


  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {table, query, columns, order, ascending, startRowIndex, maxRowsCount} = props;
    let {showableRowsCount} = this.state;
    let tableConfig = this.config.tablesById[table];
    let columnspec = {};
    columns.map((column) => columnspec[column] = tableConfig.propertiesById[column].defaultDisplayEncoding);
    if (props.columns.size > 0 && showableRowsCount > 0) {
      this.setState({loadStatus: 'loading'});
      let stopRowIndex = startRowIndex + showableRowsCount - 1;

      let pageQueryAPIargs = {
        database: this.config.dataset,
        table: tableConfig.fetchTableName,
        columns: columnspec,
        order,
        ascending: ascending,
        query,
        start: startRowIndex,
        stop: stopRowIndex
      };

      let truncatedRowsCountAPIargs = {
        database: this.config.dataset,
        table: tableConfig.fetchTableName,
        query,
        maxRowsCount
      };

      requestContext.request((componentCancellation) =>
        Promise.all([
          LRUCache.get(
            'pageQuery' + JSON.stringify(pageQueryAPIargs),
            (cacheCancellation) =>
              API.pageQuery({cancellation: cacheCancellation, ...pageQueryAPIargs}),
            componentCancellation
          ),
          LRUCache.get(
            'truncatedRowsCount' + JSON.stringify(truncatedRowsCountAPIargs),
            (cacheCancellation) =>
              API.truncatedRowsCount({cancellation: cacheCancellation, ...truncatedRowsCountAPIargs}),
            componentCancellation
          )
        ])
      )
      .then(([rows, truncatedRowsCount]) => {
        this.setState({
          loadStatus: 'loaded',
          rows: rows,
          totalTruncatedRowsCount: truncatedRowsCount
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
    let ascending = true;
    if (this.props.order == column)
      if (this.props.ascending)
        ascending = false;
      else
        column = null;
    if (this.props.onOrderChange) {
      this.props.onOrderChange(column, ascending);
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
    if (this.props.onTotalTruncatedRowsCountChange && prevState.totalTruncatedRowsCount !== this.state.totalTruncatedRowsCount) {
      this.props.onTotalTruncatedRowsCountChange(this.state.totalTruncatedRowsCount);
    }
  },

  render() {
    let {className, columns, columnWidths, order, ascending} = this.props;
    let {loadStatus, rows, width, height} = this.state;
    let tableConfig = this.config.tablesById[this.props.table];
    if (!tableConfig) {
      console.log(`Table ${this.props.table} doesn't exist'`);
      return null;
    }
    if (columns.size > 0)
      return (
        <DetectResize onResize={this.handleResize}>
          <div className={classNames('datatable', className)}>
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
                if (!tableConfig.propertiesById[column]) {
                  console.log(`Column ${column} doesn't exist on ${this.props.table}.`);
                  return;
                }
                let columnData = tableConfig.propertiesById[column];
                let {id, isPrimKey, description, name} = columnData;
                let asc = order == column && ascending;
                let desc = order == column && !ascending;
                let width = columnWidths.get(column, this.defaultWidth(columnData));
                return <Column
                  //TODO Better default column widths
                  width={width}
                  key={id}
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
                      tooltipPlacement={"bottom"}
                      tooltipTrigger={['click']}/>
                  }
                  cell={({rowIndex}) => {

                    let background = 'inherit';
                    let {maxVal, minVal, categoryColors, showBar, alignment} = columnData;
                    let cellData = rows[rowIndex][id];
                    if (showBar && cellData !== null && maxVal !== undefined && minVal !== undefined) {
                      cellData = parseFloat(cellData);
                      let percent = 100 * (cellData - minVal) / (maxVal - minVal);
                      background = `linear-gradient(to right, ${rowIndex % 2 ? 'rgb(115, 190, 252)' : 'rgb(150, 207, 253)'} ${percent}%, rgba(0,0,0,0) ${percent}%`;
                    } else if (cellData !== null && maxVal !== undefined && minVal !== undefined) {
                      let clippedCellData = Math.min(Math.max(parseFloat(cellData), minVal), maxVal);
                      background = _cloneDeep(MAX_COLOR).lighten(0.58 * (1 - (clippedCellData - minVal) / (maxVal - minVal))).rgbString();
                    }
                    if (categoryColors) {
                      let col = categoryColors[cellData] || categoryColors['_other_'];
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
        <div className={classNames('datatable', className)}>
          <Loading status="custom">No columns selected</Loading>
        </div>
      );
  }

});

module.exports = DataTableView;
