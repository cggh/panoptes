const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const PureRenderMixin = require('mixins/PureRenderMixin');

const FluxMixin = require('mixins/FluxMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

const Sidebar = require('react-sidebar');
const {Button, ButtonToolbar} = require('react-bootstrap');
const DataTableView = require('containers/DataTableView');
const SidebarHeader = require('ui/SidebarHeader');
const Icon = require('ui/Icon');

//For mock data:
const SQL = require('panoptes/SQL');
const shallowEqual = require('shallow-equals');

let DataTableWithQuery = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, StoreWatchMixin('PanoptesStore')],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    dataset: React.PropTypes.string.isRequired,
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    order: React.PropTypes.string,
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

  render() {
    let {table, query, sidebar, componentUpdate} = this.props;
    console.log(this.state.table_config.toJS());
    let {icon, description} = this.state.table_config.toObject();
    let sidebar_content = (
      <div className="sidebar">
        <SidebarHeader icon={icon} description={description}/>
      </div>
    );
//Column stuff https://github.com/cggh/panoptes/blob/1518c5d9bfab409a2f2dfbaa574946aa99919334/webapp/scripts/Utils/MiscUtils.js#L37
    //https://github.com/cggh/DQX/blob/efe8de44aa554a17ab82f40c1e421b93855ba83a/DataFetcher/DataFetchers.js#L573
    return (
      <Sidebar
        docked={sidebar}
        sidebar={sidebar_content}>
        <div className="vertical-stack">
          <ButtonToolbar className="top-bar">
            <Button onClick={() => componentUpdate({sidebar: !sidebar})}>
              <Icon className='icon' name={sidebar ? 'arrow-left' : 'bars'}/>
            </Button>
          </ButtonToolbar>

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
