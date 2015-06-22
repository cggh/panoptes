const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const PureRenderMixin = require('mixins/PureRenderMixin');

const FluxMixin = require('mixins/FluxMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

const Sidebar = require('react-sidebar');
const DataTableView = require('ui/DataTableView');
const SidebarHeader = require('ui/SidebarHeader');
const Icon = require('ui/Icon');
const QueryString = require('ui/QueryString');

const mui = require('material-ui');
const {FlatButton} = mui;

//For mock data:
const SQL = require('panoptes/SQL');
const shallowEqual = require('shallow-equals');

let DataTableWithQuery = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, StoreWatchMixin('PanoptesStore')],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    dataset: React.PropTypes.string.isRequired,
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    order: React.PropTypes.string,
    ascending: React.PropTypes.bool,
    columns: ImmutablePropTypes.listOf(
      React.PropTypes.string
    ),
    start: React.PropTypes.number,
    sidebar: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      componentUpdate: null,
      dataset: null,
      table: null,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
      order: null,
      columns: Immutable.List(),
      start: 0,
      sidebar: true
    };
  },

  getStateFromFlux() {
    return {
      table_config: this.getFlux().store('PanoptesStore').getTable(this.props.table)
    }
  },

  icon() {
    return this.state.table_config.get('icon');
  },

  title() {
    return this.props.title || this.state.table_config.get('tableCapNamePlural');
  },

  handlePick(query) {
    let flux = this.getFlux();
    flux.actions.layout.modalClose();
    this.props.componentUpdate({query: query});
  },

  render() {
    let actions = this.getFlux().actions;
    let {table, query, order, sidebar, componentUpdate} = this.props;
    let {table_config} = this.state;
    let {icon, description} = this.state.table_config.toObject();

    let sidebar_content = (
      <div className="sidebar">
        <SidebarHeader icon={icon} description={description}/>
        <FlatButton label="Change Filter"
                    primary={true}
                    onClick={() => actions.layout.modalOpen('containers/QueryPicker',
                      {
                        table: table,
                        initialQuery: query,
                        onPick: this.handlePick
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
            <QueryString className='text' prepend='Filter:' table={table_config} query={query}/>

          </div>
          <DataTableView className='grow'
            dataset={initialConfig.dataset}
            table={table}
            query={query}/>
        </div>
      </Sidebar>
    );
  }
});

module.exports = DataTableWithQuery;
