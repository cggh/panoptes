import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PureRenderMixin from 'mixins/PureRenderMixin';

import _map from 'lodash/map';
import _each from 'lodash/map';
import _reduce from 'lodash/reduce';
import titleCase from 'title-case';
import scrollbarSize from 'scrollbar-size';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

import Sidebar from 'react-sidebar';
import SidebarHeader from 'ui/SidebarHeader';

import Icon from 'ui/Icon';
import SQL from 'panoptes/SQL'
import PlotContainer from 'containers/PlotContainer';
import QueryString from 'panoptes/QueryString';
import {plotTypes, allDimensions} from 'panoptes/plotTypes';

import SelectField from 'material-ui/lib/SelectField';
import MenuItem from 'material-ui/lib/menus/menu-item';
import Divider from 'material-ui/lib/divider';

import {FlatButton} from 'material-ui';

import "plot.scss";


let PlotWithActions = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    plotType: React.PropTypes.string,
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    ..._reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.string; return props; }, {})
  },

  getDefaultProps() {
    return {
      query: SQL.NullQuery,
      componentUpdate: null,
      sidebar: true
    };
  },

  componentWillMount() {
  },

  icon() {
    return 'bar-chart';
  },

  title() {
    return this.props.title || 'Plot';
  },

  handlePropertyChange() {
    this.props.componentUpdate({
      horizontal: this.refs.horizontal.value,
      vertical: this.refs.vertical.value,
      depth: this.refs.depth.value
    });
  },

  handleQueryPick(query) {
    this.getFlux().actions.session.modalClose();
    this.props.componentUpdate({query: query});
  },

  render() {
    let {sidebar, table, query, plotType, componentUpdate} = this.props;
    const actions = this.getFlux().actions;

    let tables = _map(this.config.tables, (val, key) => ({
      payload: key,
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
      <div className="sidebar plot-sidebar">
        <SidebarHeader icon={this.icon()} description="Something here"/>
        <div className="plot-controls vertical stack">
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
          <SelectField value={plotType}
                       autoWidth={true}
                       floatingLabelText="Plot Type:"
                       onChange={(e, i, v) => componentUpdate({plotType: v})}>
            {_map(plotTypes, (plot, key) =>
              <MenuItem value={key} key={key} primaryText={plot.displayName}/>)}
          </SelectField>
          {table && plotType ?
            _map(plotTypes[plotType].dimensions, (dimension) =>
              <SelectField value={this.config.tables[table].propertiesMap[this.props[dimension]] ? this.props[dimension] : null}
                           key={dimension}
                           autoWidth={true}
                           floatingLabelText={titleCase(dimension)}
                           onChange={(e, i, v) => componentUpdate({[dimension]: v})}>
                {propertyMenu}
              </SelectField>
            )
            : null }
        </div>
      </div>
    );
    return (
      <Sidebar
        docked={sidebar}
        styles={{sidebar:{paddingRight: `${scrollbarSize()}px`}}}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrow-left' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className="text">{plotType && table ? `${plotTypes[plotType].displayName} Plot of ${this.config.tables[table].tableCapNamePlural}` : 'Plot'}</span>
            {plotType && table ?
              <span className="block text">
                <QueryString prepend="Filter:" table={table} query={query}/>
              </span>
            : null}
          </div>
          <div className="plot-container">
            <PlotContainer {...this.props} />
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = PlotWithActions;
