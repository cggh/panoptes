import PropTypes from 'prop-types';
import React from 'react';
import ReactDOMServer from 'react-dom/server'
import createReactClass from 'create-react-class';
import classNames from 'classnames';
import Color from 'color';

// Lodash
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
const PREDEFINED_COLUMN_WIDTH = 90;

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
    initialColumnWidthMode: PropTypes.string, // Defaults to 'maxVal-or-pc90Len'. Alternative is 'PropertyHeader' to use calculated heading-width.
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
      columnWidths: {},
      initialColumnWidthMode: 'maxVal-or-pc90Len',
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
      width: 0,
      height: 0,
      showableRowsCount: 0,
      totalRowsCount: 0,
      calculatedColumnWidths: undefined,
    };
  },

  componentDidMount() {
    this.calcColumnWidths();
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
    if((this.props.columns || []).join() !== (prevProps.columns || []).join())  {
      this.calcColumnWidths();
    }
  },

  calcColumnWidths() {

    const {columns, initialColumnWidthMode} = this.props;
    const {calculatedColumnWidths} = this.state;

    let calculatingColumnWidths = {};
    for (let columnIndex = 0, columnCount = columns.length; columnIndex < columnCount; columnIndex++) {
      const column = columns[columnIndex];
      const columnData = this.propertiesByColumn(column);
      const {isNumerical, maxVal, pc90Len, externalUrl, isBoolean} = columnData;

      let elementToMeasure = undefined;
      let elementAdditionalWidthPx = undefined;
      let textToMeasure = undefined;

      if (initialColumnWidthMode === 'maxVal-or-pc90Len') {

        if (isNumerical && maxVal === undefined) {
          console.error('initialColumnWidthMode is maxVal-or-pc90Len and column isNumerical but maxVal is undefined for column', column);
          break;
        }

        if (!isNumerical && pc90Len === undefined) {
          console.error('initialColumnWidthMode is maxVal-or-pc90Len and column !isNumerical but pc90Len is undefined for column', column);
          console.info('pc90Len is set by import');
          break;
        }

        if (document.getElementsByClassName('table-row-cell') === undefined || document.getElementsByClassName('table-row-cell').length === 0) {
          // table-row-cell is not available (yet) to measure.
          calculatingColumnWidths = {}; // Invalidate any knowns gathered so far.
          break;
        }

        // Assuming all cells are equal, get the first one.
        elementToMeasure = document.getElementsByClassName('table-row-cell')[0];

        // TODO: Sync with CSS (.table-row-cell)
        // Firefox needs an extra 3px compared to Chrome.
        // NOTE: <Column> has minWidth={50}, which applies to manual resizing.
        elementAdditionalWidthPx = 20 + 3 + (externalUrl !== undefined ? 14 : 0) + (isBoolean ? 27 : 0);

        if (isNumerical && maxVal !== undefined) {

          const maxValText = '-' + '8'.repeat(maxVal.toString().length);
          // Incorporate the changes from PropertyCell's formatting
          const maxValTextRendered = ReactDOMServer.renderToString(<PropertyCell prop={columnData} value={maxValText} flux={this.getFlux()}/>);
          let virtualElement = document.createElement('div');
          virtualElement.innerHTML = maxValTextRendered;
          textToMeasure = virtualElement.textContent || virtualElement.innerText;

        } else if (!isNumerical && pc90Len !== undefined) {

          const pc90Text = 'M' + 'm'.repeat(pc90Len - 1);
          // Incorporate the changes from PropertyCell's formatting
          const pc90TextRendered = ReactDOMServer.renderToString(<PropertyCell prop={columnData} value={pc90Text} flux={this.getFlux()}/>);
          let virtualElement = document.createElement('div');
          virtualElement.innerHTML = pc90TextRendered;
          textToMeasure = virtualElement.textContent || virtualElement.innerText;

        } else {
          console.error('initialColumnWidthMode is maxVal-or-pc90Len but unexpected logic branch for column', column);
          break;
        }


      } else if (initialColumnWidthMode === 'PropertyHeader') {

        elementToMeasure = document.getElementById(`PropertyHeader_${column}`);

        // NB: Needs to allow for
        // left-padding (5px)
        // + sort icon (20px)
        // + info icon (20px) (if set on this column)
        // + columnResizerContainer(6px, inc. columnResizerKnob (4px))
        elementAdditionalWidthPx = 5 + 20 + 6 + (columnData.description ? 20 : 0);

      } else {
        console.error('Unhandled initialColumnWidthMode', initialColumnWidthMode);
        break;
      }

      if (elementToMeasure !== undefined && elementToMeasure !== null) {

        // NB: This method is not supported by IE < v9.0
        // Also used in GenotypesTable.js

        const element = elementToMeasure.getElementsByClassName('label')[0];
        const elementStyles = window.getComputedStyle(element);
        let canvas2dContext = this.canvas2dContext || (this.canvas2dContext = document.createElement('canvas').getContext('2d'));
        // NB: syntax [font style][font weight][font size][font face]
        canvas2dContext.font = `${elementStyles['fontStyle']} ${elementStyles['fontWeight']} ${elementStyles['fontSize']} "${elementStyles['fontFamily']}"`;
        const columnWidthPx = Math.ceil(canvas2dContext.measureText(textToMeasure).width) + elementAdditionalWidthPx;
        calculatingColumnWidths[columnData.tableId] = calculatingColumnWidths[columnData.tableId] || {};
        calculatingColumnWidths[columnData.tableId][columnData.id] = columnWidthPx;
      }

    }

    if (Object.keys(calculatingColumnWidths).length !== 0) {
      // https://reactjs.org/docs/react-component.html "You may call setState() immediately in componentDidMount(). [...] necessary for cases like modals and tooltips when you need to measure a DOM node before rendering something that depends on its size or position."
      this.setState({calculatedColumnWidths: calculatingColumnWidths});
    }
  },

  render() {
    const {className, columns, columnWidths, order, table} = this.props;
    const {loadStatus, rows, width, height, calculatedColumnWidths} = this.state;

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
                let asc = _some(order, ([dir, orderCol]) => dir === 'asc' && orderCol === column);
                let desc = _some(order, ([dir, orderCol]) => dir === 'desc' && orderCol === column);
                let columnWidth = PREDEFINED_COLUMN_WIDTH;
                if (columnWidths[column] !== undefined) {
                  columnWidth = columnWidths[column];
                } else if (columnData.defaultWidth !== undefined) {
                  columnWidth = columnData.defaultWidth;
                } else if (calculatedColumnWidths !== undefined) {
                  columnWidth = calculatedColumnWidths[columnData.tableId][columnData.id] || PREDEFINED_COLUMN_WIDTH;
                }
                return (
                  <Column
                    width={columnWidth}
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
                      let {maxVal, minVal, valueColours, showBar, showBackgroundColour, alignment} = columnData;
                      //Qualify foreign names
                      let cellData = rows[rowIndex][columnData.tableId === table ? id : `${columnData.tableId}.${id}`];
                      if (showBar && cellData !== null && maxVal !== undefined && minVal !== undefined) {
                        cellData = parseFloat(cellData);
                        let percent = 100 * (cellData - minVal) / (maxVal - minVal);
                        background = `linear-gradient(to right, ${rowIndex % 2 ? 'rgb(115, 190, 252)' : 'rgb(150, 207, 253)'} ${percent}%, rgba(0,0,0,0) ${percent}%`;
                      } else if (showBackgroundColour && cellData !== null && maxVal !== undefined && minVal !== undefined) {
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
