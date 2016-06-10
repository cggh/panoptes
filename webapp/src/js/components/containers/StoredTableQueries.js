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
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';

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

        const iconButtonElement = (
          <IconButton
            touch={true}
            tooltip="more"
            tooltipPosition="bottom-left"
          >
            <MoreVertIcon />
          </IconButton>
        );

        const rightIconMenu = (
          <IconMenu iconButtonElement={iconButtonElement}>
            <MenuItem>Rename</MenuItem>
            <MenuItem>Overwrite default filter</MenuItem>
            <MenuItem>Delete</MenuItem>
          </IconMenu>
        );

        let storedTableQueriesListItem = (
          <ListItem key={storedTableQuery.get('id')}
                    primaryText={storedTableQuery.get('name')}
                    secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={storedTableQuery.get('query')}/></p>}
                    secondaryTextLines={2}
                    onClick={(e) => this.handleClick(e, storedTableQuery.get('query'))}
                    onDoubleClick={(e) => this.handleDoubleClick(e, storedTableQuery.get('query'))}
                    leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute', fontSize: '2em'}} name={'circle-thin'} stack={'2x'}/><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'}/></span></div>}
                    rightIconButton={this.config.isManager ? rightIconMenu : null}
          />
        );

        storedTableQueriesListItems.push(storedTableQueriesListItem);

      }

    }

    // TODO: Fix icon position and font-size style for stacked icons, being overridden by .icon style.
    return (
      <List>
        <Subheader>Stored filters:</Subheader>
        <ListItem primaryText="No filter"
                  onClick={(e) => this.handleClick(e, trivialTableQuery)}
                  onDoubleClick={(e) => this.handleDoubleClick(e, trivialTableQuery)}
                  leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'}/><Icon style={{position: 'absolute', fontSize: '2em', color: '#2196f3'}} name={'ban'} stack={'2x'}/></span></div>}
        />
        <ListItem primaryText="Default filter"
                  secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={defaultTableQuery}/></p>}
                  secondaryTextLines={2}
                  onClick={(e) => this.handleClick(e, defaultTableQuery)}
                  onDoubleClick={(e) => this.handleDoubleClick(e, defaultTableQuery)}
                  leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute', fontSize: '2em'}} name={'circle'} stack={'2x'}/><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} inverse={true}/></span></div>}
        />
        {storedTableQueriesListItems}
      </List>
    );

  }
});

module.exports = StoredTableQueries;
