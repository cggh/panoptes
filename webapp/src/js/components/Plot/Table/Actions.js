import React from 'react';
import titleCase from 'title-case';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'ui/Sidebar';

// Lodash
import _map from 'lodash/map';
import _reduce from 'lodash/reduce';
import _pickBy from 'lodash/pickBy';

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

const NULL_RANDOM_SAMPLES_CARDINALITY = '— None —';

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
    ..._reduce(allDimensions, (props, dim) => { props[dim] = React.PropTypes.string; return props; }, {}),
    randomSamplesCardinality: React.PropTypes.number
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined,
      setProps: null,
      sidebar: true,
      randomSamplesCardinality: NULL_RANDOM_SAMPLES_CARDINALITY
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

  handleChangeRandomSamplesCardinality(randomSamplesCardinality) {
    if (randomSamplesCardinality === NULL_RANDOM_SAMPLES_CARDINALITY) {
      this.props.setProps({randomSamplesCardinality: undefined});
    } else {
      this.props.setProps({randomSamplesCardinality});
    }
  },

  // NB: the behaviour depends on whether this.props.table is not NULL_TABLE.
  getDefinedQuery() {
    return this.props.query
      || (this.props.table ? this.config.tablesById[this.props.table].defaultQuery : null)
      || SQL.nullQuery;
  },

  render() {
    let {sidebar, table, plotType, setProps, randomSamplesCardinality} = this.props;

    let dimensionProperties = _pickBy(this.props, (value, name) => allDimensions.indexOf(name) !== -1);

    let tableOptions = _map(this.config.visibleTables, (table) => ({
      value: table.id,
      leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
      label: table.capNamePlural
    }));


    let randomSamplesCardinalityOptions = [
      <MenuItem key={20} primaryText={'20'} value={20} />,
      <MenuItem key={50} primaryText={'50'} value={50} />,
      <MenuItem key={100} primaryText={'100'} value={100} />,
      <MenuItem key={200} primaryText={'200'} value={200} />,
      <MenuItem key={500} primaryText={'500'} value={500} />,
      <MenuItem key={1000} primaryText={'1K'} value={1000} />,
      <MenuItem key={2000} primaryText={'2K'} value={2000} />,
      <MenuItem key={5000} primaryText={'5K'} value={5000} />,
      <MenuItem key={10000} primaryText={'10K'} value={10000} />,
      <MenuItem key={20000} primaryText={'20K'} value={20000} />,
      <MenuItem key={50000} primaryText={'50K'} value={50000} />,
      <MenuItem key={100000} primaryText={'100K'} value={100000} />,
      <MenuItem key={200000} primaryText={'200K'} value={200000} />,
      <MenuItem key={500000} primaryText={'500K'} value={500000} />,
    ];

    // Add a "no random samples" option
    // NB: The value cannot be undefined or null or '',
    // because that apparently causes a problem with the SelectField presentation (label superimposed on floating label).
    randomSamplesCardinalityOptions = [<MenuItem key={NULL_RANDOM_SAMPLES_CARDINALITY} primaryText={NULL_RANDOM_SAMPLES_CARDINALITY} value={NULL_RANDOM_SAMPLES_CARDINALITY} />].concat(randomSamplesCardinalityOptions);

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
            value={randomSamplesCardinality}
            autoWidth={true}
            floatingLabelText="Random sample set"
            onChange={(e, i, v) => this.handleChangeRandomSamplesCardinality(v)}
          >
            {randomSamplesCardinalityOptions}
          </SelectField>
          <SelectField
            value={plotType}
            autoWidth={true}
            floatingLabelText="Plot type"
            onChange={(e, i, v) => this.handleChangePlotType(v)}
          >
            {plotTypeOptions}
          </SelectField>
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
                randomSamplesCardinality={randomSamplesCardinality !== NULL_RANDOM_SAMPLES_CARDINALITY ? randomSamplesCardinality : undefined}
              /> : null
            }
          </div>
        </div>
      </Sidebar>
    );
  }
});

export default TablePlotActions;
