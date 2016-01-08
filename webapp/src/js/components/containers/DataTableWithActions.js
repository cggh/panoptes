const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const PureRenderMixin = require('mixins/PureRenderMixin');

const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

const Sidebar = require('react-sidebar').default;
const SidebarHeader = require('ui/SidebarHeader');
const Icon = require('ui/Icon');
const DataTableView = require('panoptes/DataTableView');
const QueryString = require('panoptes/QueryString');

const mui = require('material-ui');
const {FlatButton} = mui;

const SQL = require('panoptes/SQL');

let DataTableWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    order: React.PropTypes.string,
    ascending: React.PropTypes.bool,
    columns: ImmutablePropTypes.listOf(React.PropTypes.string),
    columnWidths: ImmutablePropTypes.mapOf(React.PropTypes.number),
    start: React.PropTypes.number,
    sidebar: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      componentUpdate: null,
      table: null,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
      order: null,
      ascending: true,
      columnWidths: Immutable.Map(),
      start: 0,
      sidebar: true
    };
  },

  componentWillMount() {
    this.config = this.config.tables[this.props.table];
    this.propertyGroups = {};
    _.forEach(this.config.propertyGroups, (val, key) => {
      let filteredProps = _.filter(val.properties, {showInTable:true});
      if (filteredProps.length > 0) {
        this.propertyGroups[key] = _.clone(val);
        this.propertyGroups[key].properties = filteredProps;
      }
    });
  },

  icon() {
    return this.config.icon;
  },

  title() {
    return this.props.title || this.config.tableCapNamePlural;
  },

  handleQueryPick(query) {
    this.getFlux().actions.session.modalClose();
    this.props.componentUpdate({query: query});
  },

  handleColumnChange(columns) {
    this.getFlux().actions.session.modalClose();
    this.props.componentUpdate((props) => props.set('columns', columns));
  },

  handleColumnResize(column, size) {
    this.props.componentUpdate({columnWidths:{[column]:size}});
  },

  handleOrderChange(column, ascending) {
    this.props.componentUpdate({order:column, ascending: ascending});
  },

  render() {
    let actions = this.getFlux().actions;
    let {table, query, columns, columnWidths, order, ascending, sidebar, componentUpdate} = this.props;
    //Set default columns here as we can't do it in getDefaultProps as we don't have the config there.
    if (!columns)
      columns = Immutable.List(this.config.properties)
        .filter((prop) => prop.showByDefault && prop.showInTable)
        .map((prop) => prop.propid);
    let {description} = this.config;
    let sidebar_content = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={description}/>
        <FlatButton label="Change Filter"
                    primary={true}
                    onClick={() => actions.session.modalOpen('containers/QueryPicker',
                      {
                        table: table,
                        initialQuery: query,
                        onPick: this.handleQueryPick
                      })}/>
        <br/>
        <FlatButton label="Add/Remove Columns"
                    primary={true}
                    onClick={() => actions.session.modalOpen('containers/ItemPicker',
                      {
                        groups: this.propertyGroups,
                        initialPick: columns,
                        title: `Pick columns for ${this.config.tableCapNamePlural} table`,
                        onPick: this.handleColumnChange
                      })}/>

      </div>
    );
//Column stuff https://github.com/cggh/panoptes/blob/1518c5d9bfab409a2f2dfbaa574946aa99919334/webapp/scripts/Utils/MiscUtils.js#L37
    //https://github.com/cggh/DQX/blob/efe8de44aa554a17ab82f40c1e421b93855ba83a/DataFetcher/DataFetchers.js#L573
    return (
      <Sidebar
        docked={sidebar}
        sidebar={sidebar_content}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className='pointer icon'
                  name={sidebar ? 'arrow-left' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <QueryString className='text' prepend='Filter:' table={table} query={query}/>
            <span className='text'>Sort: {order ? this.config.propertiesMap[order].name : 'None'} {order ? (ascending ? 'ascending' : 'descending') : null}</span>
            <span className='text'>{columns.size} of {this.config.properties.length} columns shown</span>

          </div>
          <DataTableView className='grow'
                         table={table}
                         query={query}
                         order={order}
                         ascending={ascending}
                         columns={columns}
                         columnWidths={columnWidths}
                         onColumnResize={this.handleColumnResize}
                         onOrderChange={this.handleOrderChange}
            />
        </div>
      </Sidebar>
    );
  }
});

module.exports = DataTableWithActions;
