import React from 'react';
import titleCase from 'title-case';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Lodash
import _map from 'lodash/map';
import _reduce from 'lodash/reduce';
import _clone from 'lodash/clone';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material UI
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import PropertySelector from 'panoptes/PropertySelector';

// Panoptes
import SQL from 'panoptes/SQL';
import TablePlot from 'Plot/Table/Widget';
import QueryString from 'panoptes/QueryString';
import {plotTypes, allDimensions} from 'panoptes/plotTypes';
import SelectFieldWithNativeFallback from 'panoptes/SelectFieldWithNativeFallback';
import FilterButton from 'panoptes/FilterButton';

import 'plot.scss';

let TablePlotActions = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    setProps: React.PropTypes.func,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    plotType: React.PropTypes.string,
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    dimensionProperties: React.PropTypes.shape(_reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.string; return props; }, {}))
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined,
      setProps: null,
      sidebar: true,
      dimensionProperties: {}
    };
  },

  icon() {
    return 'bar-chart';
  },

  title() {
    return this.props.title || 'Table Plotter';
  },

  handleQueryPick(query) {
    this.props.setProps({query: query});
  },

  handleChangeTable(table) {
    this.props.setProps({table});
  },

  handleChangePlotType(plotType) {
    this.props.setProps({plotType});
  },

  handleChangeDimensionProperty(payload) {
    let {dimension, property} = payload;
    let nextDimensionProperties = _clone(this.props.dimensionProperties);
    nextDimensionProperties[dimension] = property;
    this.props.setProps({dimensionProperties: nextDimensionProperties});
console.log('handleChangeDimensionValue nextDimensionProperties: %o', nextDimensionProperties);
  },

  // NB: the behaviour depends on whether this.props.table is not NULL_TABLE.
  getDefinedQuery() {
    return this.props.query
      || (this.props.table ? this.config.tablesById[this.props.table].defaultQuery : null)
      || SQL.nullQuery;
  },

  render() {
    let {sidebar, table, plotType, setProps, dimensionProperties} = this.props;

    let tableOptions = _map(this.config.visibleTables, (table) => ({
      value: table.id,
      leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
      label: table.capNamePlural
    }));

    let plotTypeOptions = _map(plotTypes, (plot, key) => <MenuItem value={key} key={key} primaryText={plot.displayName}/>);

    let sidebarContent = (
      <div className="sidebar plot-sidebar">
        <SidebarHeader icon={this.icon()} description="View table data graphically"/>
        <div className="plot-controls vertical stack">
          <SelectFieldWithNativeFallback
            value={table}
            autoWidth={true}
            floatingLabelText="Table"
            onChange={(v) => this.handleChangeTable(v)}
            options={tableOptions}
          />
          {table ? <FilterButton table={table} query={this.getDefinedQuery()} onPick={this.handleQueryPick}/>
            : null}
          <SelectField
            value={plotType}
            autoWidth={true}
            floatingLabelText="Plot Type:"
            onChange={(e, i, v) => this.handleChangePlotType(v)}
          >
            {plotTypeOptions}
          </SelectField>
          {table && plotType ?
            _map(plotTypes[plotType].dimensions, (dimension) => {

              // If the selected property for this dimension
              // e.g. "Chromosome" selected for the horizontal dimension
              // is actually a property of the selected table
              // e.g. "Chromosome" is a property in the "Variants" table
              // then allow the selection of this property for this dimension
              // e.g. allow "Chromosome" to be value of the horizontal dimension
              // TODO: Why is this check necessary or prudent?
              let selectedProperty = this.config.tablesById[table].propertiesById[dimensionProperties[dimension]] ? dimensionProperties[dimension] : null;

              return <PropertySelector
                table={table}
                key={dimension}
                value={selectedProperty}
                label={titleCase(dimension)}
                onSelect={(v) => this.handleChangeDimensionProperty({dimension, property: v})}
                allowNull={true}
              />;
            })
            : null }
        </div>
      </div>
    );

    // FIXME: test with {...dimensionProperties}

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
                  onClick={() => setProps({sidebar: !sidebar})}/>
            <span className="text">{table && plotType ? `${plotTypes[plotType].displayName} plot of ${this.config.tablesById[table].namePlural}` : 'Plot'}</span>
            {table && plotType ?
              <span className="block text">
                <QueryString prepend="Filter:" table={table} query={this.getDefinedQuery()} />
              </span>
            : null}
          </div>
          <div className="grow">
            {table && plotType && dimensionProperties ? <TablePlot dimensionProperties={dimensionProperties} table={table} query={this.getDefinedQuery()} /> : null}
          </div>
        </div>
      </Sidebar>
    );
  }
});

export default TablePlotActions;
