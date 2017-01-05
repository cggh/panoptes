import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

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
  ],

  propTypes: {
    table: React.PropTypes.string,
    onClick: React.PropTypes.func,
    onDoubleClick: React.PropTypes.func
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

    if (!this.config.user.isManager) {
      console.error('handleOverwriteDefault requires user.isManager');
      return null;
    }

    // TODO: Use Confirm, which will require a second-level modal.

    // Overwrite the default query in the config with the specified stored query and then update the state.
    this.getFlux().actions.api.modifyConfig(
      {
        dataset: this.config.dataset,
        path: `tablesById.${this.props.table}.defaultQuery`,
        action: 'replace',
        content: query
      }
    );

  },

  handleDelete(e, storedQueryIndex) {

    if (!this.config.user.isManager) {
      console.error('handleDelete requires user.isManager');
      return null;
    }

    // TODO: Use Confirm, which will require a second-level modal.

    // Delete the specified query in the config and update the state.
    this.getFlux().actions.api.modifyConfig(
      {
        dataset: this.config.dataset,
        path: `tablesById.${this.props.table}.storedQueries.${storedQueryIndex}`,
        action: 'delete'
      }
    );

  },

  render() {
    let {table} = this.props;
    const defaultQuery = this.tableConfig().defaultQuery || SQL.nullQuery;
    const storedQueries = this.tableConfig().storedQueries || [];

    let storedQueriesListItems = storedQueries.map((storedQuery, index) => {
      const {name, query} = storedQuery;

      // FIXME: IconMenu isn't showing (meantime developing using List instead).
      let rightIconButtons = null;
      if (this.config.user.isManager) {
        rightIconButtons = (
          <div>
            <IconButton
              tooltip="Set as default"
              tooltipPosition="top-left"
              onClick={(e) => this.handleOverwriteDefault(e, query)}
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

      return <ListItem
               key={JSON.stringify({name, query})}
               primaryText={name}
               secondaryText={<p className="list-string"><QueryString className="text" table={table} query={query} /></p>}
               secondaryTextLines={2}
               onClick={(e) => this.handleClick(e, query)}
               onDoubleClick={(e) => this.handleDoubleClick(e, query)}
               leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute', fontSize: '2em'}} name={'circle-thin'} stack={'2x'} /><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} /></span></div>}
               rightIconButton={rightIconButtons}
             />;

    });


    // TODO: Fix icon position and font-size style for stacked icons, being overridden by .icon style.
    return (
      <List>
        <Subheader>Stored filters:</Subheader>
        <ListItem
          primaryText="No filter"
          onClick={(e) => this.handleClick(e, SQL.nullQuery)}
          onDoubleClick={(e) => this.handleDoubleClick(e, SQL.nullQuery)}
          leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} /><Icon style={{position: 'absolute', fontSize: '2em', color: '#2196f3'}} name={'ban'} stack={'2x'} /></span></div>}
        />
        <ListItem
          primaryText="Default filter"
          secondaryText={<p className="list-string"><QueryString className="text" table={table} query={defaultQuery} /></p>}
          secondaryTextLines={2}
          onClick={(e) => this.handleClick(e, defaultQuery)}
          onDoubleClick={(e) => this.handleDoubleClick(e, defaultQuery)}
          leftIcon={<div><span className={'fa-stack'}><Icon style={{position: 'absolute', fontSize: '2em'}} name={'circle'} stack={'2x'} /><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} inverse={true} /></span></div>}
        />
        {storedQueriesListItems}
      </List>
    );

  }
});

export default StoredTableQueries;
