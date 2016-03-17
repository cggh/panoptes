import React from 'react';
import Immutable from 'immutable';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'react-sidebar';

// UI components
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Material UI components
import TextField from 'material-ui/lib/text-field';

// lodash functions
import _clone from 'lodash/clone';
import _filter from 'lodash/filter';
import _forEach from 'lodash/forEach';

// Panoptes components
import SQL from 'panoptes/SQL';
import ListView from 'panoptes/ListView';


let ListWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin, LinkedStateMixin],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    sidebar: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      table: null,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
      order: null,
      ascending: true,
      sidebar: true
    };
  },

  getInitialState() {
    return {
      picked: this.props.initialSelection,
      search: ''
    };
  },

  componentWillMount() {
    this.config = this.config.tables[this.props.table];
    this.propertyGroups = {};
    _forEach(this.config.propertyGroups, (val, key) => {
      let filteredProps = _filter(val.properties, {showInTable: true});
      if (filteredProps.length > 0) {
        this.propertyGroups[key] = _clone(val);
        this.propertyGroups[key].properties = filteredProps;
      }
    });
  },

  icon() {
    return this.config.icon;
  },

  title() {
    return this.props.title || this.config.tableCapNamePlural;
  },


  render() {
    let {table, query, columns, order, ascending, sidebar, componentUpdate} = this.props;
    let {description} = this.config;

    // If columns have not been set, then use showByDefault && showInTable to determine which to show.
    if (!columns)
      columns = Immutable.List(this.config.properties)
        .filter((prop) => prop.showByDefault && prop.showInTable)
        .map((prop) => prop.propid);

    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={description}/>
        <div className="search">
          <TextField floatingLabelText="Search" valueLink={this.linkState('search')}/>
        </div>
        <ListView
           table={table}
           query={query}
           order={order}
           ascending={ascending}
           columns={columns}
          />
      </div>
    );


    return (
      <Sidebar
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'expand' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}
                  title={sidebar ? 'Expand' : 'Sidebar'}
            />
            <span className="text">TODO: label of selected item will go here</span>
          </div>
          <p>TODO: data item view for selected item goes here</p>
        </div>
      </Sidebar>
    );
  }
});

module.exports = ListWithActions;
