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
      defaultQuery: this.getFlux().store('PanoptesStore').getDefaultQueryFor(this.props.table),
      lastQuery: this.getFlux().store('PanoptesStore').getLastQueryFor(this.props.table)
    };
  },

  getInitialState() {
    return {
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial())
    };
  },

  componentWillMount() {
    this.config = this.config.tables[this.props.table];
    if (this.props.initialQuery)
      this.setState({query: this.props.initialQuery});
    else {
      let defaultQuery = this.config.defaultQuery;
      if (defaultQuery && defaultQuery != '') {
        this.setState({query: defaultQuery});
      }
    }
  },

  icon() {
    return 'filter';
  },
  title() {
    return `Pick filter for ${this.config.tableNamePlural}`;
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
  handleUseQuery(query) {
    this.props.onPick(query);

    // Add query to list of recently used queries for this table.
    this.getFlux().actions.session.tableQueryUsed(this.props.table, this.state.query);

  },
  handleSetQueryAsDefault() {
    //TODO
console.log('handleSetAsDefault');
  },
  handleStoreQuery() {
    //TODO
console.log('handleStore');

    // TODO: transfer this to persistent storage.
    // Add query to list of stored queries for this table.
    this.getFlux().actions.session.tableQueryStore(this.props.table, this.state.query);

  },

  render() {
    let {query, lastQuery, defaultQuery} = this.state;
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
            <List>
              <ListItem primaryText="Default filter"
                        secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={defaultQuery}/></p>}
                        secondaryTextLines={2}
                        onClick={() => this.handleQueryChange(defaultQuery)}
                        onDoubleClick={() => {
                          this.handleQueryChange(defaultQuery);
                          this.handlePick();
                        }
                        }/>
              <Divider />
              <ListItem primaryText="Previous filter"
                        secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={lastQuery}/></p>}
                        secondaryTextLines={2}
                        onClick={() => this.handleQueryChange(lastQuery)}
                        onDoubleClick={() => {
                          this.handleQueryChange(lastQuery);
                          this.handlePick();
                        }
                        }/>
            </List>
            <Divider />
            <StoredTableQueries table={table} onSelectQuery={this.handleQueryChange} />
            <Divider />
            <RecentlyUsedTableQueries table={table} onSelectQuery={this.handleUseQuery} />
          </div>
        )}>
        <div className="vertical stack">
          <div className="grow scroll-within query-editor-container">
            <QueryEditor table={table} query={query} onChange={this.handleQueryChange}/>
          </div>
          <div className="centering-container">
            <QueryString className="text" prepend="" table={table} query={query}/>
          </div>
          <div className="centering-container">
            <RaisedButton
              label="Set as Default"
              onClick={this.handleSetQueryAsDefault}
              icon={<Icon fixedWidth={true} name={'anchor'} />}
              style={{marginRight: '20px'}}
            />
            <RaisedButton
              label="Store"
              onClick={this.handleStoreQuery}
              icon={<Icon fixedWidth={true} name={'archive'} />}
              style={{marginRight: '20px'}}
            />
            <RaisedButton
              label="Use"
              primary={true}
              onClick={this.handlePick}
            />

          </div>
        </div>
        </Sidebar>


      </div>
    );
  }

});

module.exports = QueryPicker;
