import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

import _map from 'lodash/map';
import _each from 'lodash/map';
import _filter from 'lodash/filter';
import scrollbarSize from 'scrollbar-size';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

import Sidebar from 'react-sidebar';
import SidebarHeader from 'ui/SidebarHeader';

import Icon from 'ui/Icon';
import SQL from 'panoptes/SQL';
import ItemMap from 'containers/item_views/ItemMap';
import QueryString from 'panoptes/QueryString';

import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import Divider from 'material-ui/Divider';

import {FlatButton} from 'material-ui';

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

  render() {
    let {sidebar, table, query, column, componentUpdate} = this.props;
    const actions = this.getFlux().actions;


    let tables = _map(_filter(this.config.tables, 'hasGeoCoord'),
      (val) => ({
        payload: val.id,
        icon: <Icon fixedWidth={true} name={val.icon}/>,
        text: (<div className="dropdown-option">{val.tableCapNamePlural}</div>)
      }));

    let propertyMenu = [];
    let i = 0;
    if (table) {
      const propertyGroups = this.config.tables[table].propertyGroups;
      _each(propertyGroups, (group) => {
        if (propertyMenu.length) {
          propertyMenu.push(<Divider key={i++}/>);
        }
        let {id, name} = group;
        propertyMenu.push(<MenuItem disabled value={id} key={id} primaryText={name}/>);
        _each(group.properties, (property) => {
          let {propid, name} = property;
          propertyMenu.push(<MenuItem value={propid} key={propid} primaryText={name}/>);
        });
      });
    }
    let sidebarContent = (
      <div className="sidebar map-sidebar">
        <SidebarHeader icon={this.icon()} description="Something here"/>
        <div className="map-controls vertical stack">
          <SelectField value={table}
                       autoWidth={true}
                       floatingLabelText="Table:"
                       onChange={(e, i, v) => componentUpdate({table: v})}>
            {tables.map(({payload, text, icon}) =>
              <MenuItem value={payload} key={payload} leftIcon={icon} primaryText={text}/>)}
          </SelectField>
          {table ? <FlatButton label="Change Filter"
                               primary={true}
                               onClick={() => actions.session.modalOpen('containers/QueryPicker',
                      {
                        table: table,
                        initialQuery: query,
                        onPick: this.handleQueryPick
                      })}/>
            : null}
          {table ? <FlatButton label="Clear Filter"
                               primary={true}
                               onClick={() => componentUpdate({query: SQL.NullQuery})}/>
            : null}
          {table ?
              <SelectField value={this.config.tables[table].propertiesMap[column] ? column : null}
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
                  name={sidebar ? 'arrow-left' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className="text">{table ? `Map of ${this.config.tables[table].tableCapNamePlural}` : 'Map'}</span>
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
