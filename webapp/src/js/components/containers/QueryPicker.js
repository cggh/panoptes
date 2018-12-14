import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Sidebar from 'ui/Sidebar';
import {HotKeys} from 'react-hotkeys'; // 0.9.0 needs {...}
import scrollbarSize from 'scrollbar-size';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import Button from 'ui/Button';
import Divider from '@material-ui/core/Divider';
import TextField from '@material-ui/core/TextField';
import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';

// UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Panoptes
import QueryString from 'panoptes/QueryString';
import QueryEditor from 'panoptes/QueryEditor';
import SQL from 'panoptes/SQL';

// Containers
import RecentlyUsedTableQueries from 'containers/RecentlyUsedTableQueries';
import StoredTableQueries from 'containers/StoredTableQueries';

let QueryPicker = createReactClass({
  displayName: 'QueryPicker',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: PropTypes.string.isRequired,
    onPick: PropTypes.func.isRequired,
    initialQuery: PropTypes.string,
    initialStoredFilterNameFocus: PropTypes.bool
  },

  getDefaultProps() {
    return {
      initialStoredFilterNameFocus: false
    };
  },

  getInitialState() {
    return {
      query: this.props.initialQuery || this.state.defaultTableQuery || SQL.nullQuery,
      storedFilterNameOpen: this.props.initialStoredFilterNameFocus,
      hasSidebar: true,
      storedFilterName: ''
    };
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.state.storedFilterNameOpen && this.storedFilterNameField) {
      this.storedFilterNameField.focus();
    }
  },

  icon() {
    return 'filter';
  },

  title() {
    return `Pick filter for ${this.tableConfig().namePlural}`;
  },

  handleEnter() {
    this.handlePick();
  },

  handlePick() {
    this.props.onPick(this.state.query);

    // Add this query to the list of recently used queries for this table.
    this.getFlux().actions.session.tableQueryUsed(this.props.table, this.state.query);
  },

  handleQueryChange(newQuery) {
    this.setState({
      query: newQuery
    });
  },

  handleStoredFilterNameOpen() {
    if (!this.config.user.isManager) {
      console.error('handleStoredFilterNameOpen requires user.isManager');
      return null;
    }
    this.setState({storedFilterNameOpen: true});
  },

  handleStoredFilterNameChange(event) {
    this.setState({storedFilterName: event.target.value});
  },

  handleStoredFilterNameBlur(event) {
    if (this.state.storedFilterName === '') {
      // NB: If this runs when storedFilterName !== '', handleStore() will not run, because the event gets quashed, apparently.
      this.setState({storedFilterNameOpen: false});
    }
  },

  handleStore() {
    if (!this.config.user.isManager) {
      console.error('handleStore requires user.isManager');
      return null;
    }
    if (this.state.storedFilterName === '') {
      return null;
    }

    // TODO: Only store if there isn't already one with the same name and query.

    // Store the current query in the db and update the state.
    this.getFlux().actions.api.modifyConfig(
      {
        dataset: this.config.dataset,
        path: `tablesById.${this.props.table}.storedQueries`,
        action: 'merge',
        content: [{
          query: this.state.query,
          name: this.state.storedFilterName
        }],
      }
    );

    // Hide the input field and clear its value.
    this.setState({storedFilterNameOpen: false, storedFilterName: ''});
  },

  handleToggleSidebar() {
    this.setState({hasSidebar: !this.state.hasSidebar});
  },

  render() {
    let {query, storedFilterNameOpen, hasSidebar, storedFilterName} = this.state;
    let {table} = this.props;

    let hotKeysKeyMap = {
      'storeFilter': ['enter']
    };
    let hotKeysHandlers = {
      'storeFilter': (e) => { this.handleStore(); }
    };

    return (
      <div className="large-modal query-picker">
        <Sidebar
          width={348}
          styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
          docked={hasSidebar}
          transitions={false}
          touch={false}
          sidebar={(
            <div className="sidebar" style={{width: '348px', marginTop: '8px'}}>
              <SidebarHeader icon={this.icon()} description={'Filters can be used to show only the rows that meet specific criteria.'}/>
              <List>
                <ListItem
                  button
                  onClick={(e) => this.handleQueryChange(SQL.nullQuery)}
                  onDoubleClick={(e) => this.handlePick(SQL.nullQuery)}
                >
                  <ListItemIcon>
                    <div><span className={'fa-stack'}><Icon style={{position: 'absolute'}} name={'filter'} stack={'1x'} /><Icon style={{position: 'absolute', fontSize: '2em', color: '#2196f3'}} name={'ban'} stack={'2x'} /></span></div>
                  </ListItemIcon>
                  <ListItemText
                    primary="Clear filter"
                  />
                </ListItem>
              </List>
              <Divider/>
              <StoredTableQueries table={table} onClick={this.handleQueryChange} onDoubleClick={this.handlePick}/>
              <Divider/>
              <RecentlyUsedTableQueries table={table} onClick={this.handleQueryChange} onDoubleClick={this.handlePick}/>
            </div>
          )}>
          <div className="vertical stack">
            <div className="top-bar">
              <Icon className="pointer icon"
                name={hasSidebar ? 'arrow-left' : 'bars'}
                onClick={this.handleToggleSidebar}
                title={hasSidebar ? 'Expand' : 'Sidebar'}
              />
              <span className="block text">Filter editor</span>
            </div>
            <div className="grow scroll-within query-editor-container">
              <QueryEditor table={table} query={query} onChange={this.handleQueryChange}/>
            </div>
            <div className="centering-container">
              <QueryString className="text" table={table} query={query}/>
            </div>
            <div className="centering-container">
              {
                this.config.user.isManager && query ?
                  <div className="centering-container">
                    <Button
                      raised="true"
                      label="Get JSON"
                      color="primary"
                      onClick={() => prompt('Query as JSON:', query)}
                      iconName="paste"
                    />
                  </div>
                  : null
              }
              {
                this.config.user.isManager && storedFilterNameOpen ?
                  <div>
                    <HotKeys keyMap={hotKeysKeyMap} handlers={hotKeysHandlers}>
                      <TextField
                        ref={(ref) => this.storedFilterNameField = ref}
                        helperText="Stored filter name"
                        value={storedFilterName}
                        onChange={this.handleStoredFilterNameChange}
                        onBlur={this.handleStoredFilterNameBlur}
                        style={{width: '10em', marginRight: '10px'}}
                      />
                      <Button
                        raised="true"
                        style={{marginRight: '10px'}}
                        label="Store"
                        color="primary"
                        onClick={this.handleStore}
                        iconName="database"
                      />
                    </HotKeys>
                  </div>
                  : null
              }
              {
                this.config.user.isManager && !storedFilterNameOpen ?
                  <div>
                    <Button
                      raised="true"
                      style={{marginRight: '10px'}}
                      label="Store as..."
                      color="primary"
                      onClick={this.handleStoredFilterNameOpen}
                      iconName="database"
                    />
                  </div>
                  : null
              }
              <Button
                raised="true"
                label="Apply"
                color="primary"
                onClick={this.handlePick}
                iconName="check"
                iconInverse={true}
              />
            </div>
          </div>
        </Sidebar>
      </div>
    );
  },
});

export default QueryPicker;
