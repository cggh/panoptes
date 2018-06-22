import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Material UI
import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';
import ListSubheader from '@material-ui/core/ListSubheader';

// UI
import Icon from 'ui/Icon';

// Panoptes
import QueryString from 'panoptes/QueryString';


let RecentlyUsedTableQueries = createReactClass({
  displayName: 'RecentlyUsedTableQueries',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    StoreWatchMixin('SessionStore')
  ],

  propTypes: {
    table: PropTypes.string,
    onClick: PropTypes.func,
    onDoubleClick: PropTypes.func
  },

  getStateFromFlux() {
    return {
      usedTableQueries: this.getFlux().store('SessionStore').getState().get('usedTableQueries')
      // TODO: usedTableQueries: this.getFlux().store('SessionStore').getUsedTableQueriesFor({table: this.props.table})
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
    let {usedTableQueries} = this.state;

    let usedTableQueriesList = null;

    if (usedTableQueries.size > 0) {

      let usedTableQueriesListItems = [];

      for (let i = 0, len = usedTableQueries.size; i < len; i++) {

        let usedTableQuery = usedTableQueries.get(i);

        // TODO: prefilter these by table
        if (usedTableQuery.get('table') === table) {

          let usedTableQueriesListItem = (
            <ListItem
              button
              key={`usedTableQueriesListItem${i}`}
              onClick={(e) => this.handleClick(e, usedTableQuery.get('query'))}
              onDoubleClick={(e) => this.handleDoubleClick(e, usedTableQuery.get('query'))}
            >
              <ListItemIcon>
                <Icon fixedWidth={true} name={'filter'}/>
              </ListItemIcon>
              <ListItemText
                primary={<span className="list-string"><QueryString className="text" table={table} query={usedTableQuery.get('query')}/></span>}
                secondary="Import and configure datasets"
              />
            </ListItem>
          );

          usedTableQueriesListItems.push(usedTableQueriesListItem);

        }

      }

      usedTableQueriesList = (
        <List>
          <ListSubheader>Recently used filters:</ListSubheader>
          {usedTableQueriesListItems}
        </List>
      );

    } else {
      usedTableQueriesList = (
        <List>
          <ListSubheader>No recently used filters.</ListSubheader>
        </List>
      );
    }
    return usedTableQueriesList;
  },
});

export default RecentlyUsedTableQueries;
