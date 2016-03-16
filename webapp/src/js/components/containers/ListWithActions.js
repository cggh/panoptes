import React from 'react';
import Immutable from 'immutable';
import PureRenderMixin from 'mixins/PureRenderMixin';

import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'react-sidebar';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

import _clone from 'lodash/clone';
import _filter from 'lodash/filter';
import _forEach from 'lodash/forEach';

import SQL from 'panoptes/SQL';

let ListWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

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
    let {table, query, columns, columnWidths, order, ascending, sidebar, componentUpdate} = this.props;
    //Set default columns here as we can't do it in getDefaultProps as we don't have the config there.
    if (!columns)
      columns = Immutable.List(this.config.properties)
        .filter((prop) => prop.showByDefault && prop.showInTable)
        .map((prop) => prop.propid);
    let {description} = this.config;
    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={description}/>
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
          </div>
          <p>hello</p>
        </div>
      </Sidebar>
    );
  }
});

module.exports = ListWithActions;
