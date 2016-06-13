import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Material UI
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import IconMenu from 'material-ui/IconMenu';
import IconButton from 'material-ui/IconButton';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
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

  handleRename(e, storedTableQueryId) {
console.log('handleRename storedTableQueryId:' + storedTableQueryId);

    // TODO: Use Confirm, but we are already in a modal!


  },

  handleOverwrite(e, storedTableQueryId) {
console.log('handleOverwrite storedTableQueryId:' + storedTableQueryId);

    // TODO: Use Confirm, but we are already in a modal!


  },

  handleOverwriteDefault(e, storedTableQueryId) {
console.log('handleOverwriteDefault storedTableQueryId:' + storedTableQueryId);

    // TODO: Use Confirm, but we are already in a modal!


  },

  handleDelete(e, storedTableQueryId) {
console.log('handleDelete storedTableQueryId:' + storedTableQueryId);

    if (!this.config.isManager) {
      console.error('handleDelete requires isManager');
      return null;
    }

    // TODO: Use Confirm, but we are already in a modal!

    // Delete the specified query in the db and update the state.
    this.getFlux().actions.api.deleteStoredTableQuery(
      {
        dataset: this.config.dataset,
        id: storedTableQueryId
      }
    );

  },

  render() {
    let {table} = this.props;
    let {defaultTableQuery, storedTableQueries} = this.state;

    let storedTableQueriesListItems = [];

    // TODO: remove storedTableQueries (assume defined)
    if (storedTableQueries && storedTableQueries.size > 0) {

      for (let i = 0, len = storedTableQueries.size; i < len; i++) {

        let storedTableQuery = storedTableQueries.get(i);

        // FIXME: IconMenu isn't showing (meantime developing using List instead).

        let storedTableQueriesListItem = (
          <ListItem
            key={storedTableQuery.get('id')}
            primaryText={storedTableQuery.get('name')}
            secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={storedTableQuery.get('query')} /></p>}
            secondaryTextLines={2}
            TMPonClick={(e) => this.handleClick(e, storedTableQuery.get('query'))}
            TMPonDoubleClick={(e) => this.handleDoubleClick(e, storedTableQuery.get('query'))}
            leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute', fontSize: '2em'}} name={'circle-thin'} stack={'2x'} /><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} /></span></div>}
            rightIconButton={
              this.config.isManager ?
              <IconMenu iconButtonElement={<IconButton><MoreVertIcon /></IconButton>}>
                <MenuItem key="1" rightIcon={<Icon name={'pencil'}/>} primaryText="Rename" onClick={(e) => this.handleRename(e, storedTableQuery.get('id'))} />
                <MenuItem key="2" rightIcon={<Icon name={'arrow-circle-o-left'}/>} primaryText="Overwrite" onClick={(e) => this.handleOverwrite(e, storedTableQuery.get('id'))} />
                <MenuItem key="3" rightIcon={<Icon name={'thumb-tack'}/>} primaryText="Default" onClick={(e) => this.handleOverwriteDefault(e, storedTableQuery.get('id'))} />
                <MenuItem key="4" rightIcon={<Icon name={'trash-o'}/>} primaryText="Delete" onClick={(e) => this.handleDelete(e, storedTableQuery.get('id'))} />
              </IconMenu>
              : null
            }
          >
            <List>
              <ListItem key="1" rightIcon={<Icon name={'pencil'}/>} primaryText="Rename" onClick={(e) => this.handleRename(e, storedTableQuery.get('id'))} />
              <ListItem key="2" rightIcon={<Icon name={'arrow-circle-o-left'}/>} primaryText="Overwrite" onClick={(e) => this.handleOverwrite(e, storedTableQuery.get('id'))} />
              <ListItem key="3" rightIcon={<Icon name={'thumb-tack'}/>} primaryText="Default" onClick={(e) => this.handleOverwriteDefault(e, storedTableQuery.get('id'))} />
              <ListItem key="4" rightIcon={<Icon name={'trash-o'}/>} primaryText="Delete" onClick={(e) => this.handleDelete(e, storedTableQuery.get('id'))} />
            </List>
          </ListItem>
        );

        storedTableQueriesListItems.push(storedTableQueriesListItem);

      }

    }

    // TODO: Fix icon position and font-size style for stacked icons, being overridden by .icon style.
    return (
      <List>
        <Subheader>Stored filters:</Subheader>
        <ListItem primaryText="No filter"
                  onClick={(e) => this.handleClick(e, this.trivialTableQuery)}
                  onDoubleClick={(e) => this.handleDoubleClick(e, this.trivialTableQuery)}
                  leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} /><Icon style={{position: 'absolute', fontSize: '2em', color: '#2196f3'}} name={'ban'} stack={'2x'} /></span></div>}
        />
        <ListItem primaryText="Default filter"
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
