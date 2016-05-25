import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';

// Panoptes
import QueryString from 'panoptes/QueryString';


let RecentlyUsedTableQueries = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    StoreWatchMixin('SessionStore')
  ],

  title() {
    return this.props.title;
  },

  getStateFromFlux() {
    return {
      usedTableQueries: this.getFlux().store('SessionStore').getState().get('usedTableQueries')
    };
  },

  getInitialState() {
    return null;
  },

  handleClick(e, query) {
    this.props.onSelectQuery(query);
  },

  render() {
    let {table} = this.props;
    let {usedTableQueries} = this.state;

    let usedTableQueriesList = null;

    if (usedTableQueries.size > 0) {

      let usedTableQueriesListItems = [];

      for (let i = 0, len = usedTableQueries.size; i < len; i++) {

        let usedTableQuery = usedTableQueries.get(i);

        // TODO: prefilter these by table
        if (usedTableQuery.get('table') === table) {

          let usedTableQueriesListItem = (
            <ListItem key={'usedTableQueriesListItem' + i}
                      primaryText={'Recent ' + i}
                      secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={usedTableQuery.get('query')}/></p>}
                      secondaryTextLines={2}
                      onClick={(e) => this.handleClick(e, usedTableQuery.get('query'))}
            />
          );

          usedTableQueriesListItems.push(usedTableQueriesListItem);

        }

      }

      usedTableQueriesList = (
        <List>
          <Subheader>Recently used filters</Subheader>
          {usedTableQueriesListItems}
        </List>
      );

    } else {
      usedTableQueriesList = (
        <List>
          <Subheader>No recently used filters.</Subheader>
        </List>
      );
    }
    return usedTableQueriesList;
  }
});

module.exports = RecentlyUsedTableQueries;
