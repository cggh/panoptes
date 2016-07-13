import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import titleCase from 'title-case';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Lodash
import _map from 'lodash/map';
import _each from 'lodash/map';
import _reduce from 'lodash/reduce';
import _filter from 'lodash/filter';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import Divider from 'material-ui/Divider';
import {FlatButton} from 'material-ui';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Panoptes
import SQL from 'panoptes/SQL';
import PlotContainer from 'containers/PlotContainer';
import QueryString from 'panoptes/QueryString';
import {plotTypes, allDimensions} from 'panoptes/plotTypes';
import SelectFieldWithNativeFallback from 'panoptes/SelectFieldWithNativeFallback';

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
      query: SQL.nullQuery,
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

  handleQueryPick(query) {
    this.getFlux().actions.session.modalClose();
    this.props.componentUpdate({query: query});
  },

  handleChangeTable(table) {
    this.props.componentUpdate({table});
  },

  render() {
    let {sidebar, table, query, plotType, componentUpdate} = this.props;
    const actions = this.getFlux().actions;

    let tableOptions = _map(this.config.visibleTables, (table) => ({
      value: table.id,
      leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
      label: table.capNamePlural
    }));

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
                                onClick={() => componentUpdate({query: SQL.nullQuery})}
                              />;
    }

    let sidebarContent = (
      <div className="sidebar plot-sidebar">
        <SidebarHeader icon={this.icon()} description="Something here"/>
        <div className="plot-controls vertical stack">
          <SelectFieldWithNativeFallback
            value={table}
            autoWidth={true}
            floatingLabelText="Table"
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
          <SelectField value={plotType}
                       autoWidth={true}
                       floatingLabelText="Plot Type:"
                       onChange={(e, i, v) => componentUpdate({plotType: v})}>
            {_map(plotTypes, (plot, key) =>
              <MenuItem value={key} key={key} primaryText={plot.displayName}/>)}
          </SelectField>
          {table && plotType ?
            _map(plotTypes[plotType].dimensions, (dimension) =>
              <SelectField value={this.config.tablesById[table].propertiesById[this.props[dimension]] ? this.props[dimension] : null}
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
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  title={sidebar ? 'Expand' : 'Sidebar'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className="text">{plotType && table ? `${plotTypes[plotType].displayName} Plot of ${this.config.tablesById[table].capNamePlural}` : 'Plot'}</span>
            {plotType && table ?
              <span className="block text">
                <QueryString prepend="Filter:" table={table} query={query}/>
              </span>
            : null}
          </div>
          <div className="grow">
            <PlotContainer {...this.props} />
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = PlotWithActions;
