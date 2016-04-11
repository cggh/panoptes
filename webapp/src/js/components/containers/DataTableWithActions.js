import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PureRenderMixin from 'mixins/PureRenderMixin';

import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'react-sidebar';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import DataTableView from 'panoptes/DataTableView';
import QueryString from 'panoptes/QueryString';

import _clone from 'lodash/clone';
import _filter from 'lodash/filter';
import _forEach from 'lodash/forEach';
import FlatButton from 'material-ui/lib/flat-button';

import SQL from 'panoptes/SQL';

let DataTableWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    order: React.PropTypes.string,
    ascending: React.PropTypes.bool,
    columns: ImmutablePropTypes.listOf(React.PropTypes.string),
    columnWidths: ImmutablePropTypes.mapOf(React.PropTypes.number),
    initialStartRowIndex: React.PropTypes.number,
    sidebar: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      table: null,
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
      order: null,
      ascending: true,
      columnWidths: Immutable.Map(),
      initialStartRowIndex: 0,
      sidebar: true
    };
  },

  componentWillMount() {
    this.config = this.config.tables[this.props.table];
    this.propertyGroups = {};
    _forEach(this.config.propertyGroups, (val, key) => {
      let filteredProps = _filter(val.properties, {showInTable: true});
      if (filteredProps.length > 0) {
        this.propertyGroups[key] = _clone(val);
        this.propertyGroups[key].properties = filteredProps;
      }
    });
  },

  icon() {
    return this.config.icon;
  },

  title() {
    return this.props.title || this.config.tableCapNamePlural;
  },

  handleQueryPick(query) {
    this.getFlux().actions.session.modalClose();
    this.props.componentUpdate({query: query});
  },

  handleColumnChange(columns) {
    this.getFlux().actions.session.modalClose();
    this.props.componentUpdate((props) => props.set('columns', columns));
  },

  handleColumnResize(column, size) {
    this.props.componentUpdate({columnWidths: {[column]: size}});
  },

  handleOrderChange(column, ascending) {
    this.props.componentUpdate({order: column, ascending: ascending});
  },

  handleFetchedRowsCountChange(fetchedRowsCount) {
    this.setState({fetchedRowsCount: fetchedRowsCount});
  },

  handleShowableRowsCountChange(showableRowsCount) {
    this.setState({showableRowsCount: showableRowsCount});
  },

  handleNextPage() {
    // FIXME: In some cases, this allows us to navigate past the end.
    // Without a totalRowCount we can only know the end when we've either reached it or gone past it.
    this.setState({startRowIndex: this.state.startRowIndex + this.state.showableRowsCount});
  },

  handlePreviousPage() {
    let rowIndex = this.state.startRowIndex - this.state.showableRowsCount;
    if (rowIndex < 0) {
      rowIndex = 0;
    }
    this.setState({startRowIndex: rowIndex});
  },

  handleFirstPage() {
    this.setState({startRowIndex: 0});
  },

  // TODO: handleLastPage()

  getInitialState() {
    return {
      fetchedRowsCount: 0,
      startRowIndex: this.props.initialStartRowIndex,
      showableRowsCount: 0
    };
  },

  render() {
    let actions = this.getFlux().actions;
    let {table, query, columns, columnWidths, order, ascending, sidebar, componentUpdate} = this.props;
    let {fetchedRowsCount, startRowIndex, showableRowsCount} = this.state;
    //Set default columns here as we can't do it in getDefaultProps as we don't have the config there.
    if (!columns)
      columns = Immutable.List(this.config.properties)
        .filter((prop) => prop.showByDefault && prop.showInTable)
        .map((prop) => prop.propid);
    let {description} = this.config;
    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={description}/>
        <FlatButton label="Change Filter"
                    primary={true}
                    onClick={() => actions.session.modalOpen('containers/QueryPicker',
                      {
                        table: table,
                        initialQuery: query,
                        onPick: this.handleQueryPick
                      })}/>
        <br/>
        <FlatButton label="Add/Remove Columns"
                    primary={true}
                    onClick={() => actions.session.modalOpen('containers/GroupedItemPicker',
                      {
                        groups: this.propertyGroups,
                        initialPick: columns,
                        title: `Pick columns for ${this.config.tableCapNamePlural} table`,
                        onPick: this.handleColumnChange
                      })}/>

      </div>
    );

    let pageBackwardNav = null;
    if (startRowIndex != 0) {
      // Unless we are showing the first row, provide nav to previous rows.
      pageBackwardNav = (
        <span>
        <Icon className="pointer icon"
              name="fast-backward"
              title={'First ' + showableRowsCount + ' rows'}
              onClick={this.handleFirstPage}
        />
        <Icon className="pointer icon"
              name="step-backward"
              title={'Previous ' + showableRowsCount + ' rows'}
              onClick={this.handlePreviousPage}
        />
        </span>
      );
    } else {
      // Show disabled backwards nav.
      pageBackwardNav = (
        <span>
        <Icon className="pointer icon disabled"
              name="fast-backward"
              title={'Showing first ' + fetchedRowsCount + ' rows'}
        />
        <Icon className="pointer icon disabled"
              name="step-backward"
              title={'Showing first ' + fetchedRowsCount + ' rows'}
        />
        </span>
      );
    }

    let shownRowsMessage = null;
    if (fetchedRowsCount == 0 && startRowIndex == 0) {
      // If we're showing nothing, but we're at the beginning, assume there are no rows to show.
      shownRowsMessage = <span className="text">No rows to show</span>;
    } else if (fetchedRowsCount == 0 && startRowIndex != 0) {
      // If we're showing nothing, and we're not at the beginning, assume we've gone past the last row.
      shownRowsMessage = <span className="text">Gone past the last row</span>;
    } else if (fetchedRowsCount != 0 && fetchedRowsCount < showableRowsCount) {
      // If we're showing something and it's fewer than possible, assume we're showing the last rows.
      shownRowsMessage = <span className="text">Showing rows {startRowIndex + 1}–{startRowIndex + fetchedRowsCount} of {startRowIndex + fetchedRowsCount}</span>;
    } else if (fetchedRowsCount != 0 && fetchedRowsCount == showableRowsCount) {
      // If we're showing something and it's all we can show, then make no further assumptions (there could be more or we might be showing the last lot).
      shownRowsMessage = <span className="text">Showing rows {startRowIndex + 1}–{startRowIndex + fetchedRowsCount}</span>;
    }

    let pageForwardNav = null;
    if (fetchedRowsCount != 0 && fetchedRowsCount == showableRowsCount) {
      // If we are showing something and it's as many as possible, then provide nav to further rows.
      pageForwardNav = (
        <span>
        <Icon className="pointer icon"
              name="step-forward"
              title={'Next ' + showableRowsCount + ' rows'}
              onClick={this.handleNextPage}
        />
        </span>
      );
    } else {
      // Show disabled forwards nav.
      pageForwardNav = (
        <span>
        <Icon className="pointer icon disabled"
              name="step-forward"
              title={'Showing last ' + fetchedRowsCount + ' rows'}
        />
        </span>
      );
    }




//Column stuff https://github.com/cggh/panoptes/blob/1518c5d9bfab409a2f2dfbaa574946aa99919334/webapp/scripts/Utils/MiscUtils.js#L37
    //https://github.com/cggh/DQX/blob/efe8de44aa554a17ab82f40c1e421b93855ba83a/DataFetcher/DataFetchers.js#L573
    return (
      <Sidebar
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}
                  title={sidebar ? 'Expand' : 'Sidebar'}
            />
            <QueryString className="text" prepend="Filter:" table={table} query={query}/>
            <span className="text">Sort: {order ? this.config.propertiesMap[order].name : 'None'} {order ? (ascending ? 'ascending' : 'descending') : null}</span>
            <span className="text">{columns.size} of {this.config.properties.length} columns shown</span>
            {pageBackwardNav}
            {shownRowsMessage}
            {pageForwardNav}
          </div>
          <DataTableView className="grow"
                         table={table}
                         query={query}
                         order={order}
                         ascending={ascending}
                         columns={columns}
                         columnWidths={columnWidths}
                         onColumnResize={this.handleColumnResize}
                         onOrderChange={this.handleOrderChange}
                         startRowIndex={startRowIndex}
                         onShowableRowsCountChange={this.handleShowableRowsCountChange}
                         onFetchedRowsCountChange={this.handleFetchedRowsCountChange}
            />
        </div>
      </Sidebar>
    );
  }
});

module.exports = DataTableWithActions;
