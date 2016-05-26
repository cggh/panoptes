import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import IconButton from 'material-ui/IconButton';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import TextField from 'material-ui/TextField';

// Panoptes
import QueryString from 'panoptes/QueryString';

import Icon from 'ui/Icon';

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
      // storedTableQueries: this.getFlux().store('SessionStore').getStoredTableQueriesFor(this.props.table)
      // storedTableQueries: this.getFlux().store('PanoptesStore').getStoredQueriesFor(this.props.table)
    };
  },

  getInitialState() {
    return null;
  },

  handleClick(e, query) {
    this.props.onSelectQuery(query);
  },

  handleNameChange(storedQueryIndex) {
//TODO
console.log('handleNameChange storedQueryIndex: ' + storedQueryIndex);
console.log('handleNameChange storedTableQueries.get(storedQueryIndex): %o', this.state.storedTableQueries.get(storedQueryIndex));
  },

  render() {
    let {table} = this.props;
    let {storedTableQueries} = this.state;

    let storedTableQueriesList = null;

    if (storedTableQueries.size > 0) {

      let storedTableQueriesListItems = [];

      const iconButtonElement = (
        <IconButton
          tooltip="more"
          tooltipPosition="bottom-left"
        >
          <MoreVertIcon />
        </IconButton>
      );

      const rightIconMenu = (
        <IconMenu iconButtonElement={iconButtonElement}>
          <MenuItem>Reply</MenuItem>
          <MenuItem>Forward</MenuItem>
          <MenuItem iconClassName="fa fa-trash-o">Delete</MenuItem>
        </IconMenu>
      );

      for (let i = 0, len = storedTableQueries.size; i < len; i++) {

        let storedTableQuery = storedTableQueries.get(i);

        // TODO: prefilter these by table
        if (storedTableQuery.get('table') === table) {

          let storedTableQueriesListItem = (
            <ListItem key={'storedTableQueriesListItem' + i}
                      primaryText={<TextField
                        id={'storedTableQuery_' + i}
                        value={'Filter ' + i}
                        onChange={this.handleNameChange(i)}
                      />}
                      secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={storedTableQuery.get('query')}/></p>}
                      secondaryTextLines={2}
                      onClick={(e) => this.handleClick(e, storedTableQuery.get('query'))}
                      FArightIconButton={<IconButton tooltip="Delete" iconClassName="fa fa-trash-o"/>}
                      leftIcon={<Icon fixedWidth={true} name={'database'}/>}
                      rightIconButton={rightIconMenu}
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
      storedTableQueriesList = null;
    }
    return storedTableQueriesList;
  }
});

module.exports = StoredTableQueries;
