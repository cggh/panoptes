import React from 'react';
import Sidebar from 'react-sidebar';
import scrollbarSize from 'scrollbar-size';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Material UI
import RaisedButton from 'material-ui/RaisedButton';
import IconButton from 'material-ui/IconButton';
import {List, ListItem} from 'material-ui/List';
import Divider from 'material-ui/Divider';
import Subheader from 'material-ui/Subheader';

import Icon from 'ui/Icon';

// Panoptes
import QueryString from 'panoptes/QueryString';
import QueryEditor from 'panoptes/QueryEditor';
import SQL from 'panoptes/SQL';

// Containers
import RecentlyUsedTableQueries from 'containers/RecentlyUsedTableQueries';
import StoredTableQueries from 'containers/StoredTableQueries';

let QueryPicker = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    StoreWatchMixin('PanoptesStore')],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    onPick: React.PropTypes.func.isRequired,
    initialQuery: React.PropTypes.string
  },

  getStateFromFlux() {
    return {
      defaultTableQuery: this.getFlux().store('PanoptesStore').getDefaultTableQueryFor(this.props.table)
    };
  },

  getInitialState() {
    return {
      query: this.props.initialQuery || this.state.defaultTableQuery || SQL.WhereClause.encode(SQL.WhereClause.Trivial())
    };
  },

  componentWillMount() {
    this.tableConfig = this.config.tables[this.props.table];
  },

  icon() {
    return 'filter';
  },
  title() {
    return `Pick filter for ${this.tableConfig.tableNamePlural}`;
  },

  handleEnter() {
    this.handlePick();
  },
  handlePick() {
    this.props.onPick(this.state.query);

    // Add query to list of recently used queries for this table.
    this.getFlux().actions.session.tableQueryUsed(this.props.table, this.state.query);
  },
  handleQueryChange(newQuery) {
    this.setState({
      query: newQuery
    });
  },
  handleStoreTableQuery() {

    // TODO: remove this session-based mockup of persistent storage.
    this.getFlux().actions.session.tableQueryStore(this.props.table, this.state.query);

    // Add query to list of stored queries for this table.
    this.getFlux().store('PanoptesStore').setStoredTableQuery(this.props.table, this.state.query);

  },

  render() {
    let {query} = this.state;
    let {table} = this.props;

    return (
      <div className="large-modal query-picker">
        <Sidebar
          styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
          docked={true}
          transitions={false}
          touch={false}
          sidebar={(
          <div>
            <StoredTableQueries table={table} onSelectQuery={this.handleQueryChange} />
            <Divider />
            <RecentlyUsedTableQueries table={table} onSelectQuery={this.handleQueryChange} />
          </div>
        )}>
        <div className="vertical stack">
          <div className="grow scroll-within query-editor-container">
            <QueryEditor table={table} query={query} onChange={this.handleQueryChange}/>
          </div>
          <div className="centering-container">
            <QueryString className="text" prepend="Filter: " table={table} query={query}/>
          </div>
          <div className="centering-container">
            {this.config.isManager ?
              <RaisedButton
                label="Store"
                onClick={this.handleStoreTableQuery}
                icon={<Icon fixedWidth={true} name={'database'} />}
                style={{marginRight: '20px'}}
              />
            : null}
            <RaisedButton
              label="Use"
              primary={true}
              onClick={this.handlePick}
              icon={<Icon fixedWidth={true} name={'check'} inverse={true} />}
            />

          </div>
        </div>
        </Sidebar>


      </div>
    );
  }

});

module.exports = QueryPicker;
