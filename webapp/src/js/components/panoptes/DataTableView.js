const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const classNames = require('classnames');
const Color = require('color');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const DataFetcherMixin = require('mixins/DataFetcherMixin');


const {Table, Column} = require('fixed-data-table');
import 'fixed-data-table/dist/fixed-data-table.css';

// Panoptes components
const API = require('panoptes/API');
const LRUCache = require('util/LRUCache');
const ErrorReport = require('panoptes/ErrorReporter');
const SQL = require('panoptes/SQL');
const PropertyCell = require('panoptes/PropertyCell');
const PropertyHeader = require('panoptes/PropertyHeader');

// UI components
const Loading = require('ui/Loading');
const Icon = require('ui/Icon');
const DetectResize = require('utils/DetectResize');

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
    DataFetcherMixin('table', 'query', 'columns', 'order', 'ascending', 'start')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    order: React.PropTypes.string,
    ascending: React.PropTypes.bool,
    start: React.PropTypes.number,
    columns: ImmutablePropTypes.listOf(React.PropTypes.string),
    columnWidths: ImmutablePropTypes.mapOf(React.PropTypes.number),
    onColumnResize: React.PropTypes.func,
    onOrderChange: React.PropTypes.func
  },


  getDefaultProps() {
    return {
      table: null,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
      order: null,
      ascending: true,
      start: 0,
      columns: Immutable.List(),
      columnWidths: Immutable.Map()
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
      width: 0,
      height: 0
    };
  },


  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {table, query, columns, order, ascending, start} = props;
    let {height} = this.state;
    let tableConfig = this.config.tables[table];
    let columnspec = {};
    columns.map((column) => columnspec[column] = tableConfig.propertiesMap[column].defaultDisplayEncoding);
    if (props.columns.size > 0) {
      this.setState({loadStatus: 'loading'});
      // TODO: Account for horizontal scrollbar
      let stop = start + Math.floor((height - HEADER_HEIGHT - SCROLLBAR_HEIGHT) / ROW_HEIGHT) - 1;
      let APIargs = {
        database: this.config.dataset,
        table: tableConfig.fetchTableName,
        columns: columnspec,
        order: order,
        ascending: ascending,
        query: query,
        start: start,
        stop: stop
      };
      requestContext.request((componentCancellation) =>
          LRUCache.get(
            'pageQuery' + JSON.stringify(APIargs),
            (cacheCancellation) =>
              API.pageQuery({cancellation: cacheCancellation, ...APIargs}),
            componentCancellation
          )
        )
        .then((data) => {
          this.setState({
            loadStatus: 'loaded',
            rows: data
          });
        })
        .catch(API.filterAborted)
        .catch(LRUCache.filterCancelled)
        .catch((xhr) => {
          ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
          this.setState({loadStatus: 'error'});
        });
    }
    else
      this.setState({rows: []});
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
    this.fetchData(this.props, this._requestContext);
  },

  render() {
    let {className, columns, columnWidths, order, ascending} = this.props;
    let {loadStatus, rows, width, height} = this.state;
    let tableConfig = this.config.tables[this.props.table];
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
                if (!tableConfig.propertiesMap[column]) {
                  console.log(`Column ${column} doesn't exist on ${this.props.table}.`);
                  return;
                }
                let columnData = tableConfig.propertiesMap[column];
                let {propid, isPrimKey, description, name} = columnData;
                let asc = order == column && ascending;
                let desc = order == column && !ascending;
                let width = columnWidths.get(column, this.defaultWidth(columnData));
                return <Column
                  //TODO Better default column widths
                  width={width}
                  key={propid}
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
                      onClick={() => this.handleOrderChange(propid)}
                      prefix={(asc || desc) ?
                        <Icon className="sort" name={asc ? 'sort-amount-asc' : 'sort-amount-desc'}/> :
                        null}
                      name={name}
                      description={description}
                      tooltipPlacement={"bottom"}
                      tooltipTrigger={['click']}/>
                  }
                  cell={({rowIndex}) => {

                    let background = 'rgba(0,0,0,0)';
                    let {maxVal, minVal, categoryColors, showBar, alignment} = columnData;
                    let cellData = rows[rowIndex][propid];
                    if (showBar && cellData !== null && maxVal !== undefined && minVal !== undefined) {
                      cellData = parseFloat(cellData);
                      let percent = 100 * (cellData - minVal) / (maxVal - minVal);
                      background = `linear-gradient(to right, ${rowIndex % 2 ? 'rgb(115, 190, 252)' : 'rgb(150, 207, 253)'} ${percent}%, rgba(0,0,0,0) ${percent}%`;
                    } else if (cellData !== null && maxVal !== undefined && minVal !== undefined) {
                      let clippedCellData = Math.min(Math.max(parseFloat(cellData), minVal), maxVal);
                      background = MAX_COLOR.clone().lighten(0.58 * (1 - (clippedCellData - minVal) / (maxVal - minVal))).rgbString();
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
