import React from 'react';
import classNames from 'classnames';
import Color from 'color';
import _uniq from 'lodash/uniq';

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

// Constants in this component
// const MAX_COLOR = Color('#44aafb');
const ROW_HEIGHT = 30;
const HEADER_HEIGHT = 50;
// const SCROLLBAR_HEIGHT = 15;
const COLUMN_WIDTH = 100;

let PivotTableView = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'query', 'columnProperty', 'rowProperty')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
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

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {query, columnProperty, rowProperty} = props;

    this.definedQuery = query;
    if (this.definedQuery === undefined) {
      this.definedQuery = this.tableConfig().defaultQuery !== undefined ? this.tableConfig().defaultQuery : SQL.nullQuery;
    }

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
      table: this.tableConfig().fetchTableName,
      columns: columns,
      query: this.definedQuery,
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
        let uniqueColumns = ['_all_'].concat(columnData ? _uniq(columnData.array) : []);
        let uniqueRows = ['_all_'].concat(rowData ? _uniq(rowData.array) : []);
        let dataByColumnRow = {};
        uniqueColumns.forEach((columnValue) => dataByColumnRow[columnValue] = {'_all_': 0});
        dataByColumnRow['_all_'] = {};
        uniqueRows.forEach((rowValue) => dataByColumnRow['_all_'][rowValue] = 0);
        for (let i = 0; i < countData.shape[0]; ++i) {
          dataByColumnRow['_all_']['_all_'] += countData.array[i];
          if (columnProperty) {
            dataByColumnRow[columnData.array[i]]['_all_'] += countData.array[i];
          }
          if (rowProperty) {
            dataByColumnRow['_all_'][rowData.array[i]] += countData.array[i];
          }
          if (columnProperty && rowProperty) {
            dataByColumnRow[columnData.array[i]][rowData.array[i]] = countData.array[i];
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

  render() {
    let {className, columnProperty, rowProperty} = this.props;
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
              return <Column
              //TODO Better default column widths
              width={COLUMN_WIDTH}
              key={columnValue}
              allowCellsRecycling={true}
              isResizable={false}
              minWidth={50}
              header={
                    <div className="table-row-cell"
                         style={{
                           textAlign: columnValue == '_all_' ? 'center' : colPropConfig.alignment,
                           width: COLUMN_WIDTH,
                           height: HEADER_HEIGHT + 'px',
                           background: background
                         }}>
                      { columnValue == '_all_' ? 'All' :
                        <PropertyCell prop={colPropConfig} value={columnValue}/> }
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
