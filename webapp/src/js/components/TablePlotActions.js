import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import titleCase from 'title-case';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'ui/Sidebar';

// Lodash
import _map from 'lodash.map';
import _reduce from 'lodash.reduce';
import _pickBy from 'lodash.pickby';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import PropertySelector from 'panoptes/PropertySelector';

// Panoptes
import SQL from 'panoptes/SQL';
import TablePlot from 'TablePlot';
import QueryString from 'panoptes/QueryString';
import {plotTypes, allDimensions} from 'panoptes/plotTypes';
import SelectWithNativeFallback from 'panoptes/SelectWithNativeFallback';
import FilterButton from 'panoptes/FilterButton';
import RandomSubsetSizeSelector from 'panoptes/RandomSubsetSizeSelector';

import 'plot.scss';

let TablePlotActions = createReactClass({
  displayName: 'TablePlotActions',

  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    setProps: PropTypes.func,
    title: PropTypes.string,
    sidebar: PropTypes.bool,
    plotType: PropTypes.string,
    table: PropTypes.string,
    query: PropTypes.string,
    ..._reduce(allDimensions, (props, dim) => { props[dim] = PropTypes.string; return props; }, {}),
    randomSubsetSize: PropTypes.number
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      plotType: '',
      query: undefined,
      setProps: null,
      sidebar: true,
      randomSubsetSize: 20000 //To avoid fetching all by default
    };
  },

  icon() {
    return 'chart-bar';
  },

  title() {
    return this.props.title || 'Table Plotter';
  },

  handleQueryPick(query) {
    this.props.setProps({query});
  },

  handleChangeTable(table) {
    this.props.setProps({table});
  },

  handleChangePlotType(plotType) {
    this.props.setProps({plotType});
  },

  handleChangeRandomSubsetSize(randomSubsetSize) {
    this.props.setProps({randomSubsetSize});
  },

  // NB: the behaviour depends on whether this.props.table is not NULL_TABLE.
  getDefinedQuery() {
    return this.props.query
      || (this.props.table ? this.config.tablesById[this.props.table].defaultQuery : null)
      || SQL.nullQuery;
  },

  render() {
    let {sidebar, table, plotType, setProps, randomSubsetSize} = this.props;

    let dimensionProperties = _pickBy(this.props, (value, name) => allDimensions.indexOf(name) !== -1);

    let tableOptions = _map(this.config.visibleTables, (table) => ({
      value: table.id,
      leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
      label: table.capNamePlural
    }));

    let sidebarContent = (
      <div className="sidebar plot-sidebar">
        <SidebarHeader icon={this.icon()} description="View table data graphically"/>
        <div className="plot-controls vertical stack">
          <SelectWithNativeFallback
            value={table}
            fullWidth={true}
            helperText="Table"
            onChange={this.handleChangeTable}
            options={tableOptions}
          />
          {table ? <FilterButton table={table} query={this.getDefinedQuery()} onPick={this.handleQueryPick}/>
            : null}
          <RandomSubsetSizeSelector
            value={randomSubsetSize}
            onChange={this.handleChangeRandomSubsetSize}
          />
          <SelectWithNativeFallback
            value={plotType}
            fullWidth={true}
            helperText="Plot type"
            onChange={this.handleChangePlotType}
            options={_map(plotTypes, (plot, key) => ({ value: key, key: key, label: plot.displayName}))}
          />
          {table && plotType ?
            _map(plotTypes[plotType].dimensions, (dimension) =>
              <PropertySelector
                table={table}
                key={dimension}
                value={this.config.tablesById[table].propertiesById[dimensionProperties[dimension]] ? dimensionProperties[dimension] : null}
                label={titleCase(dimension)}
                onSelect={(v) => setProps({[dimension]: v})}
                allowNull={true}
              />
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
              name={sidebar ? 'arrow-left' : 'bars'}
              title={sidebar ? 'Expand' : 'Sidebar'}
              onClick={() => setProps({sidebar: !sidebar})}/>
            <span className="text">{table && plotType ? `${plotTypes[plotType].displayName} plot of ${this.config.tablesById[table].namePlural}` : 'Plot'}</span>
            {table && plotType ?
              <span className="block text">
                <QueryString prefix="Filter: " table={table} query={this.getDefinedQuery()} />
              </span>
              : null}
          </div>
          <div className="grow">
            {table && plotType && dimensionProperties ?
              <TablePlot
                table={table}
                plotType={plotType}
                query={this.getDefinedQuery()}
                {...dimensionProperties}
                randomSubsetSize={randomSubsetSize}
                displayModeBar={true}
              /> : null
            }
          </div>
        </div>
      </Sidebar>
    );
  },
});

export default TablePlotActions;
