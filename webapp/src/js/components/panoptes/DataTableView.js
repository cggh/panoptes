const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const classNames = require('classnames');

const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const SetSizeToParent = require('mixins/SetSizeToParent');

const API = require('panoptes/API');
const ErrorReport = require('panoptes/ErrorReporter');
const SQL = require('panoptes/SQL');

const {Table, Column} = require('fixed-data-table');
import 'fixed-data-table/dist/fixed-data-table.css';
const Loading = require('ui/Loading');

let DataTableView = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    SetSizeToParent
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string.isRequired,
    order: React.PropTypes.string,
    start: React.PropTypes.number,
    columns: ImmutablePropTypes.listOf(React.PropTypes.string),
    columnWidths: ImmutablePropTypes.mapOf(React.PropTypes.number),
    onColumnResize: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      table: null,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
      order: null,
      start: 0,
      columns: Immutable.List(),
      columnWidths: Immutable.Map()
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
      size: {
        width: 0,
        height: 0
      }
    };
  },

  componentDidMount() {
    this.getDataIfNeeded({}, this.props);
  },
  componentWillReceiveProps(nextProps) {
    this.getDataIfNeeded(this.props, nextProps);
  },

  getDataIfNeeded(lastProps, nextProps) {
    let queryKeys = ['table', 'query', 'columns', 'order', 'start'];
    let update_needed = false;
    queryKeys.forEach((key) => {
      if (!Immutable.is(lastProps[key], nextProps[key]))
        update_needed = true;
    });
    if (update_needed)
      this.fetchData(nextProps);
  },

  fetchData(props) {
    let { table, query, className, columns } = props;
    let tableConfig = this.config.tables[table];
    this.setState({loadStatus: 'loading'});
    let columnspec = {};
    columns.map(column => columnspec[column] = tableConfig.propertiesMap[column].defaultFetchEncoding);

    API.pageQuery({
      database: this.config.dataset,
      table: table,
      columns: columnspec,
      query: SQL.WhereClause.decode(query)
    })
      .then((data) => {
        this.setState({loadStatus: 'loaded'});
        this.setState({rows: data});
      })
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
        this.setState({loadStatus: 'error'});
      });

  },

  handleColumnResize(width, column) {
    if (this.props.onColumnResize)
      this.props.onColumnResize(column, width);
    //So that "isResizing" on FDT gets set back to false, force an update
    //this.forceUpdate();
  },

  renderHeader(label, cellDataKey, columnData, rowData, width) {
    return <div className="table-row-header" style={{width:width}}> {label} </div>
  },

  renderCell(cellData, cellDataKey, rowData, rowIndex, columnData, width) {
    return <div className="table-cell" style={{textAlign:columnData.alignment, width:width}}> {cellData} </div>
  },

  render() {
    let { query, className, columns, columnWidths } = this.props;
    let { loadStatus, rows, width, height } = this.state;
    let tableConfig = this.config.tables[this.props.table];
    if (!tableConfig) {
      console.log(`Table ${this.props.table} doesn't exist'`);
      return null;
    }
    return (
      <div className={classNames("datatable", className)}>
        <Table
          rowHeight={30}
          rowGetter={(index) => rows[index]}
          rowsCount={rows.length}
          width={width}
          height={height}
          headerHeight={50}
          onColumnResizeEndCallback={this.handleColumnResize}
          isColumnResizing={false}
          >
          {columns.map(column => {
            if (!tableConfig.propertiesMap[column]) {
              console.log(`Column ${column} doesn't exist on ${this.props.table}.`);
              return;
            }
            let {name, propid} = tableConfig.propertiesMap[column];

            return <Column
              label={name}
              //TODO Better default column widths
              width={columnWidths.get(column,120)}
              dataKey={propid}
              key={propid}
              allowCellsRecycling={true}
              cellRenderer={this.renderCell}
              headerRenderer={this.renderHeader}
              columnData={tableConfig.propertiesMap[column]}
              isResizable={true}
              minWidth={10}
              />
          })
          }
        </Table>
        <Loading status={loadStatus}/>
      </div>
    );
  }

});

module.exports = DataTableView;
