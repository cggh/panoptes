const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const classNames = require('classnames');
const Color = require('color');

const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const SetSizeToParent = require('mixins/SetSizeToParent');

const Tooltip = require('rc-tooltip');
import 'rc-tooltip/assets/bootstrap.css'
const {Table, Column} = require('fixed-data-table');
import 'fixed-data-table/dist/fixed-data-table.css';

const API = require('panoptes/API');
const ErrorReport = require('panoptes/ErrorReporter');
const SQL = require('panoptes/SQL');
const PropertyCell = require('panoptes/PropertyCell');

const Loading = require('ui/Loading');
const TooltipEllipsis = require('ui/TooltipEllipsis');
const Icon = require('ui/Icon');

const MAX_COLOR = Color("#44aafb");

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
    let queryKeys = ['table', 'query', 'columns', 'order', 'ascending', 'start'];
    let update_needed = false;
    queryKeys.forEach((key) => {
      if (!Immutable.is(lastProps[key], nextProps[key]))
        update_needed = true;
    });
    if (update_needed)
      this.fetchData(nextProps);
  },

  fetchData(props) {
    let { table, query, className, columns, order, ascending } = props;
    let tableConfig = this.config.tables[table];
    let columnspec = {};
    columns.map(column => columnspec[column] = tableConfig.propertiesMap[column].defaultDisplayEncoding);
    if (props.columns.size > 0) {
      this.setState({loadStatus: 'loading'});
      API.pageQuery({
        database: this.config.dataset,
        table: tableConfig.fetchTableName,
        columns: columnspec,
        order: order,
        ascending: ascending,
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
    }
    else
      this.setState({rows: []});
  },

  headerData(column) {
    return {
      ascending: this.props.order == column && this.props.ascending,
      descending: this.props.order == column && !this.props.ascending
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
      this.props.onOrderChange(column, ascending)
    }
  },

  renderHeader(headerData, cellDataKey, columnData, rowData, width) {
    let {ascending, descending} = headerData;
    let {description} = columnData;
    return <div className={classNames({
                              "pointer": true,
                              "table-row-header": true,
                              "sort-column-ascending": ascending,
                              "sort-column-descending": descending
                                    })}
                style={{width:width}}
                onClick={(e) => {
                if (e.target.className.indexOf("info") == -1)
                  this.handleOrderChange(columnData.propid);
                }}
      >
      {(ascending || descending) ?
        <Icon className="sort" name={ascending ? "sort-amount-asc" : "sort-amount-desc"}/> :
        null}
      <TooltipEllipsis className="label">{columnData.name}</TooltipEllipsis>
      <Tooltip placement="bottom"
               trigger={['click']}
               overlay={<span>{description}</span>}>
        <Icon className="info" name="info-circle"/>
      </Tooltip>
    </div>
  },

  renderCell(cellData, cellDataKey, rowData, rowIndex, columnData, width) {
    let background = "rgba(0,0,0,0)";
    let {maxVal, minVal, categoryColors, showBar, alignment} = columnData;
    if (showBar && cellData !== null && maxVal !== undefined && minVal !== undefined) {
      cellData = parseFloat(cellData);
      let percent = 100*(cellData - minVal)/(maxVal-minVal);
      background = `linear-gradient(to right, ${rowIndex % 2 ? "rgb(115, 190, 252)" : "rgb(150, 207, 253)"} ${percent}%, rgba(0,0,0,0) ${percent}%`
    } else if (cellData !== null && maxVal !== undefined && minVal !== undefined) {
      let clippedCellData = Math.min(Math.max(parseFloat(cellData),minVal),maxVal);
      background = MAX_COLOR.clone().lighten(0.58*(1-(clippedCellData - minVal)/(maxVal-minVal))).rgbString();
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

    return <div className="table-cell"
                style={{
                   textAlign:alignment,
                   width:width,
                   height: "30px",
                   background: background
                   }}>
      <PropertyCell prop={columnData} value={cellData}/>
    </div>
  },

  defaultWidth(columnData) {
    if (columnData.dispDataType == "Boolean")
      return 75;
    if (columnData.defaultWidth)
      return columnData.defaultWidth;
    if (columnData.isDate)
      return 110;
    if (columnData.decimDigits)
      return Math.max(15+columnData.decimDigits*15, 110);
    return 110;
  },

  render() {
    let { query, className, columns, columnWidths } = this.props;
    let { loadStatus, rows, width, height } = this.state;
    let tableConfig = this.config.tables[this.props.table];
    console.log(tableConfig)
    if (!tableConfig) {
      console.log(`Table ${this.props.table} doesn't exist'`);
      return null;
    }
    if (columns.size > 0)
      return (
        <div className={classNames("datatable", className)}>
          <Table
            rowHeight={30}
            rowGetter={(index) => rows[index]}
            rowsCount={rows.length}
            width={width}
            height={height}
            headerHeight={50}
            headerDataGetter={this.headerData}
            onColumnResizeEndCallback={this.handleColumnResize}
            isColumnResizing={false}
            >
            {columns.map(column => {
              if (!tableConfig.propertiesMap[column]) {
                console.log(`Column ${column} doesn't exist on ${this.props.table}.`);
                return;
              }
              let columnData = tableConfig.propertiesMap[column];
              let {propid, isPrimKey} = columnData;
              return <Column
                //TODO Better default column widths
                width={columnWidths.get(column,this.defaultWidth(columnData))}
                dataKey={propid}
                key={propid}
                fixed={isPrimKey}
                allowCellsRecycling={true}
                cellRenderer={this.renderCell}
                headerRenderer={this.renderHeader}
                columnData={columnData}
                isResizable={true}
                minWidth={50}
                />
            })
            }
          </Table>
          <Loading status={loadStatus}/>
        </div>
      );
    else
      return (
        <div className={classNames("datatable", className)}>
          <Loading status="custom">No columns selected</Loading>
        </div>
      )
  }

});

module.exports = DataTableView;
