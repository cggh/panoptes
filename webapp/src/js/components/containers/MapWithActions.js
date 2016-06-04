import React from 'react';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Lodash
import _map from 'lodash/map';
import _each from 'lodash/map';
import _filter from 'lodash/filter';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import Divider from 'material-ui/Divider';
import {FlatButton} from 'material-ui';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Panoptes
import SQL from 'panoptes/SQL';
import ItemMap from 'containers/item_views/ItemMap';
import QueryString from 'panoptes/QueryString';
import SelectFieldWithNativeFallback from 'panoptes/SelectFieldWithNativeFallback';

import 'map.scss';

let MapWithActions = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    column: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      query: SQL.NullQuery,
      componentUpdate: null,
      sidebar: true
    };
  },

  icon() {
    return 'globe';
  },

  title() {
    return this.props.title || 'Map';

  },

  handleQueryPick(query) {
    this.getFlux().actions.session.modalClose();
    this.props.componentUpdate({query: query});
  },

  handleChangeTable(table) {
    this.props.componentUpdate({table});
  },

  render() {
    let {sidebar, table, query, column, componentUpdate} = this.props;
    const actions = this.getFlux().actions;

    let tableOptions = _map(_filter(this.config.visibleTables, (table) => table.hasGeoCoord),
      (table) => ({
        value: table.id,
        leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
        label: table.capNamePlural
      })
    );

    let propertyMenu = [];
    let i = 0;
    if (table) {
      const propertyGroups = this.config.tablesById[table].propertyGroups;
      _each(propertyGroups, (group) => {
        if (propertyMenu.length) {
          propertyMenu.push(<Divider key={i++}/>);
        }
        let {id, name} = group;
        propertyMenu.push(<MenuItem disabled value={id} key={id} primaryText={name}/>);
        _each(group.properties, (property) => {
          let {id, name} = property;
          propertyMenu.push(<MenuItem value={id} key={id} primaryText={name}/>);
        });
      });
    }

    let filterButtonLabel = 'Change Filter';
    let decodedQuery = SQL.WhereClause.decode(query);
    let clearFilterButton = null;
    if (!query || decodedQuery.isTrivial) {
      filterButtonLabel = 'Add Filter';
    } else if (table) {
      clearFilterButton = <FlatButton
                                label="Clear Filter"
                                primary={true}
                                onClick={() => componentUpdate({query: SQL.NullQuery})}
                              />;
    }

    let sidebarContent = (
      <div className="sidebar map-sidebar">
        <SidebarHeader icon={this.icon()} description="Something here"/>
        <div className="map-controls vertical stack">
          <SelectFieldWithNativeFallback
            value={table}
            autoWidth={true}
            floatingLabelText="Table:"
            onChange={this.handleChangeTable}
            options={tableOptions}
          />
          {table ? <FlatButton label={filterButtonLabel}
                               primary={true}
                               onClick={() => actions.session.modalOpen('containers/QueryPicker',
                                 {
                                   table: table,
                                   initialQuery: query,
                                   onPick: this.handleQueryPick
                                 })}/>
            : null}
          {clearFilterButton}
          {table ?
              <SelectField value={this.config.tablesById[table].propertiesById[column] ? column : null}
                           autoWidth={true}
                           floatingLabelText="Column"
                           onChange={(e, i, v) => componentUpdate({column: v})}>
                {propertyMenu}
              </SelectField>
            : null }
        </div>
      </div>
    );
    return (
      <Sidebar
        docked={sidebar}
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  title={sidebar ? 'Expand' : 'Sidebar'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className="text">{table ? `Map of ${this.config.tablesById[table].capNamePlural}` : 'Map'}</span>
            {table ?
              <span className="block text">
                <QueryString prepend="Filter:" table={table} query={query}/>
              </span>
              : null}
          </div>
          {table ? <ItemMap {...this.props}  /> : 'Pick a table'}
        </div>
      </Sidebar>
    );
  }
});

module.exports = MapWithActions;
