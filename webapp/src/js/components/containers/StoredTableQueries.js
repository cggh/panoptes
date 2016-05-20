import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import IconButton from 'material-ui/IconButton';

// Panoptes
import QueryString from 'panoptes/QueryString';


let StoredTableQueries = React.createClass({
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
      storedTableQueries: this.getFlux().store('SessionStore').getState().get('storedTableQueries')
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
    let {storedTableQueries} = this.state;

    let storedTableQueriesList = null;

    if (storedTableQueries.size > 0) {

      let storedTableQueriesListItems = [];

      for (let i = 0, len = storedTableQueries.size; i < len; i++) {

        let storedTableQuery = storedTableQueries.get(i);

console.log('storedTableQuery.table: ' + storedTableQuery.table);
console.log('table: ' + table);

        // TODO: prefilter these by table
        if (storedTableQuery.table === table) {

          let storedTableQueriesListItem = (
            <ListItem key={'storedTableQueriesListItem' + i}
                      primaryText={'Stored ' + i}
                      secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={storedTableQuery.query}/></p>}
                      secondaryTextLines={2}
                      onClick={(e) => this.handleClick(e, storedTableQuery.query)}
                      rightIconButton={<IconButton tooltip="Delete" iconClassName="fa fa-trash-o"/>}
            />
          );

          storedTableQueriesListItems.push(storedTableQueriesListItem);

        }

      }

      storedTableQueriesList = (
        <List>
          <Subheader>Stored filters</Subheader>
          {storedTableQueriesListItems}
        </List>
      );

    } else {
      storedTableQueriesList = (
        <List>
          <Subheader>No stored filters.</Subheader>
        </List>
      );
    }
    return storedTableQueriesList;
  }
});

module.exports = StoredTableQueries;
