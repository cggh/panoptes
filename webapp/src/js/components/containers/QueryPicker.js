import React from 'react';
import Sidebar from 'react-sidebar';
import {HotKeys} from 'react-hotkeys'; // 0.9.0 needs {...}
import scrollbarSize from 'scrollbar-size';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import RaisedButton from 'material-ui/RaisedButton';
import Divider from 'material-ui/Divider';
import TextField from 'material-ui/TextField';

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

let QueryPicker = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    onPick: React.PropTypes.func.isRequired,
    initialQuery: React.PropTypes.string,
    initialStoredFilterNameFocus: React.PropTypes.bool
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
      // TODO: error message to user
      return null;
    }
    // Store the current query in the db and update the state.
    this.getFlux().actions.api.modifyConfig(
      {
        dataset: this.config.dataset,
        path: `tablesById.${this.props.table}.storedQueries`,
        action: 'merge',
        content: [{
          query: this.state.query,
          name: this.state.storedFilterName,
        }],
      }
    );
    this.setState({storedFilterNameOpen: false});
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
          styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
          docked={hasSidebar}
          transitions={false}
          touch={false}
          sidebar={(
          <div className="sidebar" style={{width: '35vw'}}>
            <SidebarHeader icon={this.icon()} description={'Filters can be used to show only the rows that meet specific criteria.'}/>
            <StoredTableQueries table={table} onClick={this.handleQueryChange} onDoubleClick={this.handlePick}/>
            <Divider/>
            <RecentlyUsedTableQueries table={table} onClick={this.handleQueryChange} onDoubleClick={this.handlePick}/>
          </div>
        )}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={hasSidebar ? 'arrows-h' : 'bars'}
                  onClick={this.handleToggleSidebar}
                  title={hasSidebar ? 'Expand' : 'Sidebar'}
            />
            <span className="block text">Filter editor</span>
          </div>
          <div className="grow scroll-within query-editor-container">
            <QueryEditor table={table} query={query} onChange={this.handleQueryChange}/>
          </div>
          <div className="centering-container">
            <QueryString className="text" prepend="" table={table} query={query}/>
          </div>
          {
            this.config.user.isManager && query ?
            <div className="centering-container">
              <RaisedButton
                label="Get JSON"
                primary={false}
                onClick={() => prompt('Query as JSON:', query)}
                icon={<Icon fixedWidth={true} name={'paste'} inverse={false} />}
              />
            </div>
            : null
          }
          <div className="centering-container">
            {
              this.config.user.isManager && storedFilterNameOpen ?
              <div>
                <HotKeys keyMap={hotKeysKeyMap} handlers={hotKeysHandlers}>
                  <TextField
                    ref={(ref) => this.storedFilterNameField = ref}
                    hintText="Stored filter name"
                    value={storedFilterName}
                    onChange={this.handleStoredFilterNameChange}
                    onBlur={this.handleStoredFilterNameBlur}
                    style={{width: '10em', marginRight: '10px'}}
                  />
                  <RaisedButton
                    style={{marginRight: '10px'}}
                    label="Store"
                    primary={false}
                    onClick={this.handleStore}
                    icon={<Icon fixedWidth={true} name={'database'} inverse={false} />}
                  />
                </HotKeys>
              </div>
              : null
            }
            {
              this.config.user.isManager && !storedFilterNameOpen ?
              <div>
                <RaisedButton
                  style={{marginRight: '10px'}}
                  label="Store as..."
                  primary={false}
                  onClick={this.handleStoredFilterNameOpen}
                  icon={<Icon fixedWidth={true} name={'database'} inverse={false} />}
                />
              </div>
              : null
            }
            <RaisedButton
              label="Use"
              primary={true}
              onClick={this.handlePick}
              icon={<Icon fixedWidth={true} name={'check'} inverse={true} />}
            />
          </div>
        </div>
        </Sidebar>
      </div>
    );
  }

});

module.exports = QueryPicker;
