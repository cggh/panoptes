import React from 'react';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Lodash
import _map from 'lodash/map';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Panoptes
import PivotTableView from 'panoptes/PivotTableView';
import PropertySelector from 'panoptes/PropertySelector';
import FilterButton from 'panoptes/FilterButton';
import SQL from 'panoptes/SQL';
import QueryString from 'panoptes/QueryString';


let PivotTableWithActions = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: React.PropTypes.func,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    table: React.PropTypes.string,
    query: React.PropTypes.string,
    columnSortOrder: React.PropTypes.array,
    rowSortOrder: React.PropTypes.array,
    columnProperty: React.PropTypes.string,
    rowProperty: React.PropTypes.string,
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
      sidebar: true
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
    // NB: Not using merge syntax.
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
    const {sidebar, table, columnProperty, rowProperty, setProps, columnSortOrder, rowSortOrder} = this.props;

    let sidebarContent = (
      <div className="sidebar pivot-sidebar">
        <SidebarHeader icon={this.icon()} description={`Summary and aggregates of the ${this.tableConfig().namePlural} table`}/>
        <div className="pivot-controls vertical stack">
          <FilterButton table={table} query={this.getDefinedQuery()} onPick={(query) => this.props.setProps({query})}/>
          <PropertySelector table={table}
                            key="columnProperty"
                            value={this.config.tablesById[table].propertiesById[columnProperty] ? columnProperty : null}
                            label="Column"
                            allowNull={true}
                            filter={(prop) => prop.isCategorical || prop.isBoolean || prop.isText}
                            onSelect={(v) => setProps({columnProperty: v})}/>
          <PropertySelector table={table}
                            key="rowProperty"
                            value={this.config.tablesById[table].propertiesById[rowProperty] ? rowProperty : null}
                            label="Row"
                            allowNull={true}
                            filter={(prop) => prop.isCategorical || prop.isBoolean || prop.isText}
                            onSelect={(v) => setProps({rowProperty: v})}/>
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
            <span className="text"><QueryString prefix="Filter:" table={table} query={this.getDefinedQuery()}/></span>
            <span className="block text">Column sort: {this.orderDescriptionString(columnSortOrder)}</span>
            <span className="block text">Row sort: {this.orderDescriptionString(rowSortOrder)}</span>
          </div>
          <div className="grow">
            <PivotTableView {...this.props} onOrderChange={this.handleOrderChange} query={this.getDefinedQuery()}/>
          </div>
        </div>
      </Sidebar>
    );
  }
});

export default PivotTableWithActions;
