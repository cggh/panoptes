import React from 'react';
import titleCase from 'title-case';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Lodash
import _map from 'lodash/map';
import _reduce from 'lodash/reduce';

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

const NULL_TABLE = '— None —';
const NULL_PLOT_TYPE = '— None —';

// CSS
//TODO: import 'Plot/Table/actions-styles.scss';

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
    ..._reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.string; return props; }, {})
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined,
      setProps: null,
      sidebar: true,
      table: NULL_TABLE,
      plotType: NULL_PLOT_TYPE
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
    if (table === NULL_TABLE) {
      this.props.setProps({table: undefined, plotType: undefined});
    } else {
      this.props.setProps({table});
    }
  },

  handleChangePlotType(plotType) {
    if (plotType === NULL_PLOT_TYPE) {
      this.props.setProps({plotType: undefined});
    } else {
      this.props.setProps({plotType});
    }
  },

  // NB: the behaviour depends on whether this.props.table is not NULL_TABLE.
  getDefinedQuery() {
    return this.props.query
      || (this.props.table !== NULL_TABLE ? this.config.tablesById[this.props.table].defaultQuery : null)
      || SQL.nullQuery;
  },

  render() {
    let {sidebar, table, plotType, setProps} = this.props;

    let tableOptions = _map(this.config.visibleTables, (table) => ({
      value: table.id,
      leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
      label: table.capNamePlural
    }));

    let plotTypeOptions = _map(plotTypes, (plot, key) => <MenuItem value={key} key={key} primaryText={plot.displayName}/>);

    // Add a "no table" and "no plot type" options
    // NB: The value cannot be undefined or null or '',
    // because that apparently causes a problem with the SelectField presentation (label superimposed on floating label).
    tableOptions = [{value: NULL_TABLE, leftIcon: undefined, label: NULL_TABLE}].concat(tableOptions);
    plotTypeOptions = [<MenuItem value={NULL_PLOT_TYPE} key={NULL_PLOT_TYPE} primaryText={NULL_PLOT_TYPE}/>].concat(plotTypeOptions);

    let sidebarContent = (
      <div className="sidebar plot-sidebar">
        <SidebarHeader icon={this.icon()} description="View table data graphically"/>
        <div className="plot-controls vertical stack">
          <SelectFieldWithNativeFallback
            value={table}
            autoWidth={true}
            floatingLabelText="Table"
            onChange={this.handleChangeTable}
            options={tableOptions}
          />
          {table !== NULL_TABLE ? <FilterButton table={table} query={this.getDefinedQuery()} onPick={this.handleQueryPick}/>
            : null}
          <SelectField
            value={plotType}
            autoWidth={true}
            floatingLabelText="Plot Type:"
            onChange={(e, i, v) => this.handleChangePlotType(v)}
          >
            {plotTypeOptions}
          </SelectField>
          {table !== NULL_TABLE && plotType !== NULL_PLOT_TYPE ?
            _map(plotTypes[plotType].dimensions, (dimension) =>
              <PropertySelector table={table}
                                key={dimension}
                                value={this.config.tablesById[table].propertiesById[this.props[dimension]] ? this.props[dimension] : null}
                                label={titleCase(dimension)}
                                onSelect={(v) => setProps({[dimension]: v})}/>
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
                  onClick={() => setProps({sidebar: !sidebar})}/>
            <span className="text">{table !== NULL_TABLE && plotType !== NULL_PLOT_TYPE ? `${plotTypes[plotType].displayName} plot of ${this.config.tablesById[table].namePlural}` : 'Plot'}</span>
            {table !== NULL_TABLE && plotType !== NULL_PLOT_TYPE ?
              <span className="block text">
                <QueryString prepend="Filter:" table={table} query={this.getDefinedQuery()} />
              </span>
            : null}
          </div>
          <div className="grow">
            {table !== NULL_TABLE && plotType !== NULL_PLOT_TYPE ? <TablePlot {...this.props} query={this.getDefinedQuery()} /> : null}
          </div>
        </div>
      </Sidebar>
    );
  }
});

export default TablePlotActions;
