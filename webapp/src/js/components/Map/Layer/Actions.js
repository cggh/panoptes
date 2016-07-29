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

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import FilterButton from 'panoptes/FilterButton';

// Panoptes
import SQL from 'panoptes/SQL';
import LayerMapWidget from 'Map/Layer/Widget';
import QueryString from 'panoptes/QueryString';
import SelectFieldWithNativeFallback from 'panoptes/SelectFieldWithNativeFallback';

import 'map.scss';

let LayerMapActions = React.createClass({
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
      query: SQL.nullQuery,
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
    this.props.componentUpdate({query: query});
  },

  handleChangeTable(table) {
    this.props.componentUpdate({table});
  },

  render() {
    let {sidebar, table, query, column, componentUpdate} = this.props;

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
          {table ? <FilterButton table={table} query={query} onPick={this.handleQueryPick}/>
            : null}
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
          <div className="vertical stack">
            {table ? <LayerMapWidget {...this.props}  /> : 'Pick a table'}
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = LayerMapActions;
