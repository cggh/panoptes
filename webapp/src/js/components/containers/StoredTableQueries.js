import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';

// UI
import Icon from 'ui/Icon';

// Panoptes
import QueryString from 'panoptes/QueryString';
import SQL from 'panoptes/SQL';


let StoredTableQueries = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    StoreWatchMixin('PanoptesStore')
  ],

  title() {
    return this.props.title;
  },

  getStateFromFlux() {
    return {
      storedTableQueries: this.getFlux().store('PanoptesStore').getStoredTableQueriesFor(this.props.table),
      defaultTableQuery: this.getFlux().store('PanoptesStore').getDefaultTableQueryFor(this.props.table)
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

  render() {
    let {table} = this.props;
    let {defaultTableQuery, storedTableQueries} = this.state;

    // TODO: This could be set once on component mount.
    let trivialTableQuery = SQL.WhereClause.encode(SQL.WhereClause.Trivial());

    let storedTableQueriesListItems = [];

    // TODO: remove storedTableQueries (assume defined)
    if (storedTableQueries && storedTableQueries.size > 0) {

      for (let i = 0, len = storedTableQueries.size; i < len; i++) {

        let storedTableQuery = storedTableQueries.get(i);

        // TODO: prefilter these by table
        if (storedTableQuery.get('table') === table) {

          let storedTableQueriesListItem = (
            <ListItem key={'storedTableQueriesListItem' + i}
                      primaryText={storedTableQuery.get('name')}
                      secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={storedTableQuery.get('query')}/></p>}
                      secondaryTextLines={2}
                      onClick={(e) => this.handleClick(e, storedTableQuery.get('query'))}
                      onDoubleClick={(e) => this.handleDoubleClick(e, storedTableQuery.get('query'))}
                      leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute', fontSize: '2em'}} name={'circle-thin'} stack={'2x'}/><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'}/></span></div>}
            />
          );

          storedTableQueriesListItems.push(storedTableQueriesListItem);

        }

      }

    }

    // TODO: Fix icon position and font-size style for stacked icons, being overridden by .icon style.
    return (
      <List>
        <Subheader>Stored filters:</Subheader>
        <ListItem primaryText="Default filter"
                  secondaryText={<p className="list-string"><QueryString className="text" prepend="Filter: " table={table} query={defaultTableQuery}/></p>}
                  secondaryTextLines={2}
                  onClick={(e) => this.handleClick(e, defaultTableQuery)}
                  onDoubleClick={(e) => this.handleDoubleClick(e, defaultTableQuery)}
                  leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute', fontSize: '2em'}} name={'circle'} stack={'2x'}/><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} inverse={true}/></span></div>}
        />
        <ListItem primaryText="No filter"
                  secondaryText={<p className="list-string"><QueryString className="text" prepend="Filter: " table={table} query={trivialTableQuery}/></p>}
                  secondaryTextLines={2}
                  onClick={(e) => this.handleClick(e, trivialTableQuery)}
                  onDoubleClick={(e) => this.handleDoubleClick(e, trivialTableQuery)}
                  leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'}/><Icon style={{position: 'absolute', fontSize: '2em', color: '#2196f3'}} name={'ban'} stack={'2x'}/></span></div>}
        />
        {storedTableQueriesListItems}
      </List>
    );

  }
});

module.exports = StoredTableQueries;
