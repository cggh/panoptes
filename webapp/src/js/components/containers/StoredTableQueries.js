import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import IconButton from 'material-ui/IconButton';

// UI
import Icon from 'ui/Icon';

// Panoptes
import QueryString from 'panoptes/QueryString';
import SQL from 'panoptes/SQL';


let StoredTableQueries = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    StoreWatchMixin('PanoptesStore')
  ],

  componentDidMount() {
    // TODO: Where is the best place to define trivialTableQuery?
    this.trivialTableQuery = SQL.WhereClause.encode(SQL.WhereClause.Trivial());
  },

  title() {
    return this.props.title;
  },

  getStateFromFlux() {
    return {
      defaultTableQuery: this.getFlux().store('PanoptesStore').getDefaultTableQueryFor(this.props.table),
      storedTableQueries: this.getFlux().store('PanoptesStore').getStoredTableQueriesFor(this.props.table)
    };
  },

  getInitialState() {
    return null;
  },

  handleClick(e, query) {
    this.props.onClick(query);
  },

  handleDoubleClick(e, query) {
    this.props.onDoubleClick(query);
  },

  handleOverwriteDefault(e, query) {

    if (!this.config.isManager) {
      console.error('handleOverwriteDefault requires isManager');
      return null;
    }

    // TODO: Use Confirm, but we are already in a modal!

    // Overwrite the default query in the db with the specified stored query and then update the state.
    this.getFlux().actions.api.setDefaultTableQuery(
      {
        dataset: this.config.dataset,
        table: this.props.table,
        query: query
      }
    );

  },

  handleDelete(e, storedTableQueryIndex) {

    if (!this.config.isManager) {
      console.error('handleDelete requires isManager');
      return null;
    }

    // TODO: Use Confirm, but we are already in a modal!

    // Delete the specified query in the db and then update the state.
    this.getFlux().actions.api.deleteStoredTableQuery(
      {
        dataset: this.config.dataset,
        table: this.props.table,
        index: storedTableQueryIndex
      }
    );

  },

  render() {
    let {table} = this.props;
    let {defaultTableQuery, storedTableQueries} = this.state;

    let storedTableQueriesListItems = [];

    // TODO: remove storedTableQueries (assume defined)
    if (storedTableQueries && storedTableQueries.size > 0) {

      storedTableQueries.forEach((storedTableQuery, index) => {

        // FIXME: IconMenu isn't showing (meantime developing using List instead).

        let rightIconButtons = null;
        if (this.config.isManager) {
          rightIconButtons = (
            <div>
              <IconButton
                tooltip="Set as default"
                tooltipPosition="top-left"
                onClick={(e) => this.handleOverwriteDefault(e, storedTableQuery.get('query'))}
              >
                <Icon name={'thumb-tack'} inverse={false} />
              </IconButton>
              <IconButton
                tooltip="Delete"
                tooltipPosition="top-left"
                onClick={(e) => this.handleDelete(e, index)}
              >
                <Icon name={'trash-o'} inverse={false} />
              </IconButton>
            </div>
          );
        }

        let storedTableQueriesListItem = (
          <ListItem
            key={index}
            primaryText={storedTableQuery.get('name')}
            secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={storedTableQuery.get('query')} /></p>}
            secondaryTextLines={2}
            onClick={(e) => this.handleClick(e, storedTableQuery.get('query'))}
            onDoubleClick={(e) => this.handleDoubleClick(e, storedTableQuery.get('query'))}
            leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute', fontSize: '2em'}} name={'circle-thin'} stack={'2x'} /><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} /></span></div>}
            rightIconButton={rightIconButtons}
          />
        );

        storedTableQueriesListItems.push(storedTableQueriesListItem);

      });

    }

    // TODO: Fix icon position and font-size style for stacked icons, being overridden by .icon style.
    return (
      <List>
        <Subheader>Stored filters:</Subheader>
        <ListItem
          primaryText="No filter"
          onClick={(e) => this.handleClick(e, this.trivialTableQuery)}
          onDoubleClick={(e) => this.handleDoubleClick(e, this.trivialTableQuery)}
          leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} /><Icon style={{position: 'absolute', fontSize: '2em', color: '#2196f3'}} name={'ban'} stack={'2x'} /></span></div>}
        />
        <ListItem
          primaryText="Default filter"
          secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={defaultTableQuery} /></p>}
          secondaryTextLines={2}
          onClick={(e) => this.handleClick(e, defaultTableQuery)}
          onDoubleClick={(e) => this.handleDoubleClick(e, defaultTableQuery)}
          leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute', fontSize: '2em'}} name={'circle'} stack={'2x'} /><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} inverse={true} /></span></div>}
        />
        {storedTableQueriesListItems}
      </List>
    );

  }
});

module.exports = StoredTableQueries;
