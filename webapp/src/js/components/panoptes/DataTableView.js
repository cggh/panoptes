const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const shallowEquals = require('shallow-equals');
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
    columns: ImmutablePropTypes.listOf(React.PropTypes.string)
  },

  getDefaultProps() {
    return {
      table: null,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
      order: null,
      start: 0,
      columns: Immutable.List()
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
    if (!shallowEquals(lastProps, nextProps))
      this.fetchData(nextProps);
  },

  fetchData(props) {
    let { table, query, className, columns } = props;
    let tableConfig = this.config.tables[table];
    console.log(tableConfig);
    this.setState({loadStatus: 'loading'});
    let columnspec = {};
    columns.map(column => columnspec[column] = tableConfig.propertiesMap[column].defaultFetchEncoding);
    setTimeout(() => {
      API.pageQuery({
        database: this.config.dataset,
        table: table,
        columns: columnspec
      })
        .then((data) => {
          this.setState({loadStatus: 'loaded'});
          this.setState({rows: data});
        })
        .catch((error) => {
          ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
          this.setState({loadStatus: 'error'});
        });

    }, 2000);
  },

  render() {
    let { query, className, columns } = this.props;
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
              headerHeight={50}>
              {columns.map(column => {
                if (!tableConfig.propertiesMap[column]) {
                  console.log(`Column ${column} doesn't exist on ${this.props.table}.`);
                  return;
                }
                let {name, propid, alignment} = tableConfig.propertiesMap[column];

                return <Column
                    label={name}
                    width={200}
                    dataKey={propid}
                    align={alignment}
                    allowCellsRecycling={true}
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
