import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import scrollbarSize from 'scrollbar-size';
import Select from '@material-ui/core/Select';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import _map from 'lodash.map';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Panoptes
import Sidebar from 'ui/Sidebar';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import PivotTableView from 'panoptes/PivotTableView';
import PropertySelector from 'panoptes/PropertySelector';
import FilterButton from 'panoptes/FilterButton';
import SQL from 'panoptes/SQL';
import QueryString from 'panoptes/QueryString';

let PivotTableWithActions = createReactClass({
  displayName: 'PivotTableWithActions',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: PropTypes.func,
    title: PropTypes.string,
    sidebar: PropTypes.bool,
    table: PropTypes.string,
    query: PropTypes.string,
    columnSortOrder: PropTypes.array,
    rowSortOrder: PropTypes.array,
    columnProperty: PropTypes.string,
    rowProperty: PropTypes.string,
    display: PropTypes.string
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      query: undefined,
      columnSortOrder: [],
      rowSortOrder: [],
      setProps: null,
      sidebar: true,
      display: 'counts'
    };
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  icon() {
    return 'table';
  },

  title() {
    return this.props.title || `Pivot ${this.tableConfig().namePlural}`;
  },

  handleOrderChange(axis, order) {
    // NB: Not using merge syntax so that undefined can be set
    if (axis === 'column') {
      this.props.setProps((props) => props.set('columnSortOrder', order));
    } else if (axis === 'row') {
      this.props.setProps((props) => props.set('rowSortOrder', order));
    }
  },

  orderDescriptionString(order) {
    if (order.length === 0) {
      return 'None';
    }
    return _map(order, ([direction, value]) =>
      `${value === '__NULL__' ? 'NULL' : value === '_all_' ? 'All' : value} ${direction === 'asc' ? 'asc' : 'desc'}`)
      .join(', ');
  },

  render() {
    const {sidebar, table, columnProperty, rowProperty, setProps, columnSortOrder, rowSortOrder, display} = this.props;

    let sidebarContent = (
      <div className="sidebar pivot-sidebar">
        <SidebarHeader icon={this.icon()} description={`Summary and aggregates of the ${this.tableConfig().namePlural} table`}/>
        <div className="pivot-controls vertical stack">
          <FilterButton table={table} query={this.getDefinedQuery()} onPick={(query) => this.props.setProps({query})}/>
          <PropertySelector table={table}
            key="columnProperty"
            value={this.config.tablesById[table].propertiesById[columnProperty] ? columnProperty : null}
            label="Columns"
            allowNull={true}
            filter={(prop) => prop.isCategorical || prop.isBoolean || prop.isText}
            onSelect={(v) => setProps({columnProperty: v, columnSortOrder: undefined})}/>
          <PropertySelector table={table}
            key="rowProperty"
            value={this.config.tablesById[table].propertiesById[rowProperty] ? rowProperty : null}
            label="Rows"
            allowNull={true}
            filter={(prop) => prop.isCategorical || prop.isBoolean || prop.isText}
            onSelect={(v) => setProps({rowProperty: v, rowSortOrder: undefined})}/>
          <FormControl>
            <InputLabel htmlFor="values">Values</InputLabel>
            <Select
              fullWidth={true}
              onChange={(e) => setProps({display: e.target.value})}
              value={display}
              input={<Input id="display" />}
              inputProps={{
                name: 'values',
                id: 'values',
              }}
            >
              <MenuItem key={'Counts'} value={'counts'}>Counts</MenuItem>
              <MenuItem key={'All'} value={'percentAll'}>Percentage of total</MenuItem>
              <MenuItem key={'Column'} value={'percentColumn'}>Percentage of column total</MenuItem>
              <MenuItem key={'Row'} value={'percentRow'}>Percentage of row total</MenuItem>
            </Select>
          </FormControl>
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
            <span className="text"><QueryString prefix="Filter: " table={table} query={this.getDefinedQuery()}/></span>
            <span className="block text">Column sort: {this.orderDescriptionString(columnSortOrder)}</span>
            <span className="block text">Row sort: {this.orderDescriptionString(rowSortOrder)}</span>
          </div>
          <div className="grow scroll-within">
            <PivotTableView
              {...this.props}
              style={{height: '100%', overflow: 'hidden'}}
              onOrderChange={this.handleOrderChange}
              query={this.getDefinedQuery()}
            />
          </div>
        </div>
      </Sidebar>
    );
  },
});

export default PivotTableWithActions;
