const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const classNames = require('classnames');

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
const Formatter = require('panoptes/Formatter');

const Loading = require('ui/Loading');
const TooltipEllipsis = require('ui/TooltipEllipsis');
const Icon = require('ui/Icon');

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
    if (columnData.externalUrl) {
      let refs = cellData.split(';');
      return (<div className="table-cell"
           style={{textAlign:columnData.alignment, width:width}}>
        {_.map(refs, (ref, index) => (
        <span>
          <a href={columnData.externalUrl.replace("{value}", ref)}>
            {ref}
          </a>
          {index < refs.length-1 ? ",": null}
        </span>
        ))}
      </div>);
    }
    if (columnData.dispDataType == "Boolean" && cellData!=='') {
      let val = (cellData == '1');
      return (<div className={"table-cell bool " + (val ? "true" : "false")}
                  style={{textAlign:columnData.alignment, width:width}}>
        {<Icon fixedWidth={true} name={val ? "check" : "times"}/>}
      </div>);
    }
    let text = Formatter(columnData, cellData);
    if (columnData.barWidth && cellData !== null) {
      cellData = parseFloat(cellData);
      let {maxVal, minVal} = columnData;
      let percent = 100*(cellData - minVal)/(maxVal-minVal);
        return (<div className="table-cell"
                   style={{textAlign:columnData.alignment,
                    width:width,
                    background: `linear-gradient(to right, ${rowIndex % 2 ? "#aee2e8" : "#B2EBF2"} ${percent}%, rgba(0,0,0,0) ${percent}%`
                    }}>
        {text}
      </div>);
    }
    return <div className="table-cell"
                style={{textAlign:columnData.alignment, width:width}}>
      {text}
    </div>
  },

  defaultWidth(columnData) {
    if (columnData.dispDataType == "Boolean")
      return 75;
    if (columnData.barWidth)
      return columnData.barWidth;
    if (columnData.defaultWidth)
      return columnData.defaultWidth;
    if (columnData.isDate)
      return 110;
    if (columnData.decimDigits)
      return Math.max(15+columnData.decimDigits*15, 80);
    return 150;
  },

  render() {
    let { query, className, columns, columnWidths } = this.props;
    let { loadStatus, rows, width, height } = this.state;
    let tableConfig = this.config.tables[this.props.table];
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
              let {propid} = columnData;
              return <Column
                //TODO Better default column widths
                width={columnWidths.get(column,this.defaultWidth(columnData))}
                dataKey={propid}
                key={propid}
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
