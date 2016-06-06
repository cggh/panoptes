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

//
// {this.config.isManager ?
//   <RaisedButton
//     label="Set as Default"
//     onClick={this.handleSetTableQueryAsDefault}
//     icon={<Icon fixedWidth={true} name={'anchor'} />}
//     style={{marginRight: '20px'}}
//   />
//   : null}

let StoredTableQueries = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    StoreWatchMixin('SessionStore', 'PanoptesStore')
  ],

  title() {
    return this.props.title;
  },

  getStateFromFlux() {
    return {
      //storedTableQueries: this.getFlux().store('SessionStore').getState().get('storedTableQueries'),

      // TODO: Convert to using Panoptes store, once writing to db is done.
      storedTableQueries: this.getFlux().store('SessionStore').getStoredTableQueriesFor(this.props.table),

      defaultTableQuery: this.getFlux().store('PanoptesStore').getDefaultTableQueryFor(this.props.table)


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

  handleSetTableQueryAsDefault() {
    this.getFlux().store('PanoptesStore').setDefaultTableQuery(this.props.table, this.state.query);
  },



  // TODO: Only show setting the default query and add stored query if user isManager
  // Allow setting of stored query as default query if user isManager
  // Allow delete of a stored query (except the default?) if user isManager
  // Allow rename of a stored query (except the default, for now) if user isManager


  render() {
    let {table} = this.props;
    let {defaultTableQuery, storedTableQueries} = this.state;

    // If we have nothing to show, then show nothing!
    if (!defaultTableQuery && (!storedTableQueries || storedTableQueries.size === 0)) {
      return null;
    }

    let defaultTableQueryListItem = null;
    if (this.state.defaultTableQuery) {
      defaultTableQueryListItem =  (
        <ListItem primaryText="Default"
              secondaryText={<p className="list-string"><QueryString className="text" prepend="Filter: " table={table} query={defaultTableQuery}/></p>}
              secondaryTextLines={2}
              onClick={(e) => this.handleClick(e, defaultTableQuery)}
              leftIcon={<Icon fixedWidth={true} name={'filter'}/>}
              />
      );
    }


    let storedTableQueriesListItems = null;

    if (storedTableQueries && storedTableQueries.size > 0) {

      storedTableQueriesListItems = [];

      const iconButtonElement = (
        <IconButton
          tooltip="more"
          tooltipPosition="bottom-left"
        >
          <MoreVertIcon />
        </IconButton>
      );

      // TODO: only if isManager
      const rightIconMenu = (
        <IconMenu iconButtonElement={iconButtonElement}>
          <MenuItem>Set as default</MenuItem>
          <MenuItem>Forward</MenuItem>
          <MenuItem iconClassName="fa fa-trash-o">Delete</MenuItem>
        </IconMenu>
      );

      for (let i = 0, len = storedTableQueries.size; i < len; i++) {

        let storedTableQuery = storedTableQueries.get(i);

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

    // There should be either a default query or a stored query (or both).
    return (
      <List>
        <Subheader>Stored filters</Subheader>
        {defaultTableQueryListItem}
        {storedTableQueriesListItems}
      </List>
    );

  }
});

module.exports = StoredTableQueries;
