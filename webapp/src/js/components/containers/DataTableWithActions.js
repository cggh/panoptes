import React from 'react';
import Sidebar from 'react-sidebar';
import scrollbarSize from 'scrollbar-size';

// Lodash
import _clone from 'lodash/clone';
import _filter from 'lodash/filter';
import _map from 'lodash/map';
import _forEach from 'lodash/forEach';

// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';

// Material UI
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Panoptes
import DataTableView from 'panoptes/DataTableView';
import QueryString from 'panoptes/QueryString';
import SQL from 'panoptes/SQL';
import DataDownloader from 'util/DataDownloader';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';
import FilterButton from 'panoptes/FilterButton';
import PivotTableWithActions from 'containers/PivotTableWithActions';

let DataTableWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    setProps: React.PropTypes.func,
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    query: React.PropTypes.string,
    order: React.PropTypes.string,
    ascending: React.PropTypes.bool,
    columns: React.PropTypes.array,
    columnWidths: React.PropTypes.object,
    initialStartRowIndex: React.PropTypes.number,
    sidebar: React.PropTypes.bool,
    initialSearchFocus: React.PropTypes.bool,
    searchText: React.PropTypes.string
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      table: null,
      query: undefined,
      order: null,
      ascending: true,
      columnWidths: {},
      initialStartRowIndex: 0,
      sidebar: true,
      initialSearchFocus: false,
      searchText: ''
    };
  },

  getInitialState() {
    return {
      fetchedRowsCount: 0,
      startRowIndex: this.props.initialStartRowIndex,
      showableRowsCount: 0,
      searchOpen: this.props.initialSearchFocus || this.props.searchText !== '',
      totalRowsCount: 0
    };
  },

  componentWillMount() {
    this.propertyGroups = {};
    _forEach(this.tableConfig().propertyGroupsById, (val, key) => {
      let filteredProps = _filter(val.properties, {showInTable: true});
      if (filteredProps.length > 0) {
        this.propertyGroups[key] = _clone(val);
        this.propertyGroups[key].properties = filteredProps;
      }
    });
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.state.searchOpen && this.props.searchText === '') {
      // Focus the searchField whenever the search is open and there is no searchText,
      // e.g. when opened from the Finder, or by clicking on the Find Text button.
      this.refs.searchField.focus();
    }
  },

  icon() {
    return this.tableConfig().icon;
  },

  title() {
    return this.props.title || this.tableConfig().capNamePlural;
  },

  handleQueryPick(query) {
    this.props.setProps({query});
  },

  handleColumnChange(columns) {
    this.getFlux().actions.session.modalClose();
    this.props.setProps((props) => props.set('columns', columns));
  },

  handleColumnResize(column, size) {
    this.props.setProps({columnWidths: {[column]: size}});
  },

  handleOrderChange(column, ascending) {
    this.props.setProps({order: column, ascending: ascending});
  },

  handleFetchedRowsCountChange(fetchedRowsCount) {
    this.setState({fetchedRowsCount});
  },

  handleShowableRowsCountChange(showableRowsCount) {
    this.setState({showableRowsCount});
  },

  handleTotalRowsCountChange(totalRowsCount) {
    this.setState({totalRowsCount});
  },

  handleNextPage() {
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

  handleLastPage() {
    this.setState({startRowIndex: this.state.totalRowsCount - this.state.showableRowsCount});
  },

  handleDownload() {
    DataDownloader.downloadTableData(
      {
        dataset: this.config.dataset,
        table: this.props.table,
        tableConfig: this.tableConfig(),
        rowsCount: this.state.totalRowsCount,
        onLimitBreach: this.handleDownloadLimitBreach,
        query: this.definedQuery,
        columns: this.props.columns,
        ascending: this.props.ascending
      }
    );
  },

  handleDownloadLimitBreach(payload) {
    let {totalDataPoints, maxDataPoints} = payload;
    let message = `You have asked to download ${totalDataPoints} data points, which is more than our current limit of ${maxDataPoints}. Please use a stricter filter or fewer columns, or contact us directly.`;
    this.getFlux().actions.session.modalOpen('ui/Alert', {title: 'Warning', message: message});
  },

  handleSearchOpen() {
    this.setState({searchOpen: true});
  },

  handleSearchChange(event) {
    this.props.setProps({searchText: event.target.value});
  },

  handleSearchBlur(event) {
    // Only close the search if it's empty.
    if (event.target.value === '') {
      this.setState({searchOpen: false});
    }
  },

  createDataTableQuery() {

    let {searchText} = this.props;

    // If there is searchText, then add the searchQuery to the base query, to form the dataTableQuery.
    let dataTableQuery = this.definedQuery;
    if (searchText !== '') {

      let searchQueryUnencoded = null;

      // Compose a query that looks for the searchText in every quickFindField.
      for (let i = 0, len = this.tableConfig().quickFindFields.length; i < len; i++) {
        let quickFindField = this.tableConfig().quickFindFields[i];

        let newComponent = SQL.WhereClause.CompareFixed(this.tableConfig().propertiesById[quickFindField].id, 'CONTAINS', searchText);

        if (i === 0) {
          searchQueryUnencoded = newComponent;
        } else if (i === 1) {
          let newOr = SQL.WhereClause.Compound('OR');
          let child = _clone(searchQueryUnencoded);
          newOr.addComponent(child);
          newOr.addComponent(newComponent);
          Object.assign(searchQueryUnencoded, newOr);
        } else {
          searchQueryUnencoded.addComponent(newComponent);
        }

      }

      // Add the searchQuery to the base query, if the base query is not trivial.
      let baseQueryDecoded = SQL.WhereClause.decode(this.definedQuery);
      if (baseQueryDecoded.isTrivial) {
        dataTableQuery = SQL.WhereClause.encode(searchQueryUnencoded);
      } else {
        let newAND = SQL.WhereClause.Compound('AND');
        let child = _clone(baseQueryDecoded);
        newAND.addComponent(child);
        newAND.addComponent(searchQueryUnencoded);
        dataTableQuery = SQL.WhereClause.encode(newAND);
      }

    }

    return dataTableQuery;
  },

  render() {

    let actions = this.getFlux().actions;
    let {table, query, columns, columnWidths, order, ascending, sidebar, setProps, searchText} = this.props;
    let {fetchedRowsCount, startRowIndex, showableRowsCount, searchOpen, totalRowsCount} = this.state;

    this.definedQuery = query;
    if (this.definedQuery === undefined) {
      this.definedQuery = this.tableConfig().defaultQuery !== undefined ? this.tableConfig().defaultQuery : SQL.nullQuery;
    }

    //Set default columns here as we can't do it in getDefaultProps as we don't have the config there.
    if (!columns) {
      columns = _filter(this.tableConfig().properties, (prop) => prop.showByDefault && prop.showInTable);
      columns = _map(columns, (prop) => prop.id);
    }
    let {description} = this.tableConfig();
    let quickFindFieldsList = '';
    for (let i = 0, len = this.tableConfig().quickFindFields.length; i < len; i++) {
      let quickFindField = this.tableConfig().quickFindFields[i];
      if (i == 0) quickFindFieldsList += 'Columns: ';
      if (i != 0) quickFindFieldsList += ', ';
      quickFindFieldsList += this.tableConfig().propertiesById[quickFindField].name;

    }
    let searchGUI = (
      <FlatButton label="Find text"
                  disabled={columns.size === 0}
                  primary={true}
                  onClick={this.handleSearchOpen}
                  icon={<Icon fixedWidth={true} name="search" />}
      />
    );
    if (searchOpen) {
      searchGUI = (
        <div>
          <RaisedButton label="Find text"
                      disabled={columns.size === 0}
                      primary={true}
                      icon={<Icon fixedWidth={true} name="search" inverse={true} />}
          />
          <TextField ref="searchField"
                     fullWidth={true}
                     floatingLabelText="Search"
                     value={searchText}
                     onChange={this.handleSearchChange}
                     onBlur={this.handleSearchBlur}
          />
          <div>{quickFindFieldsList}</div>
        </div>
      );
    }

    let dataTableQuery = this.createDataTableQuery();

    let descriptionWithHTML = <HTMLWithComponents>{description}</HTMLWithComponents>;

    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={descriptionWithHTML}/>
        <FilterButton table={table} query={this.definedQuery} onPick={this.handleQueryPick}/>
        <FlatButton label="Add/Remove Columns"
                    primary={true}
                    onClick={() => actions.session.modalOpen('containers/GroupedItemPicker',
                      {
                        groups: this.propertyGroups,
                        initialPick: columns,
                        title: `Pick columns for ${this.tableConfig().capNamePlural} table`,
                        onPick: this.handleColumnChange
                      })}
                      icon={<Icon fixedWidth={true} name="columns" />}
        />
        <FlatButton label="Download data"
                    disabled={columns.size === 0}
                    primary={true}
                    onClick={() => this.handleDownload()}
                    icon={<Icon fixedWidth={true} name="download" />}
        />
        <FlatButton label="Pivot Table"
                    primary={true}
                    onClick={() => this.flux.actions.session.tabOpen(<PivotTableWithActions table={table} />, true)}
                    icon={<Icon fixedWidth={true} name="table" />}
        />
        {searchGUI}
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
      // If we're showing something and it's all we can show, then there could be more or we might be showing the last lot.

      // What we're showing is less than we could possibly show, so it's safe to assume that we're showing the last lot.
      shownRowsMessage = <span className="text">Showing rows {startRowIndex + 1}–{startRowIndex + fetchedRowsCount} of {totalRowsCount}</span>;
    }

    let pageForwardNav = null;
    if (fetchedRowsCount != 0 && fetchedRowsCount == showableRowsCount && (startRowIndex + showableRowsCount < totalRowsCount)) {
      // If we are showing something and it's as many as possible, then provide nav to further rows.
      pageForwardNav = (
        <span>
        <Icon className="pointer icon"
              name="step-forward"
              title={'Next ' + showableRowsCount + ' rows'}
              onClick={this.handleNextPage}
        />
        <Icon className="pointer icon"
              name="fast-forward"
              title={'Last ' + showableRowsCount + ' rows'}
              onClick={this.handleLastPage}
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
        <Icon className="pointer icon disabled"
              name="fast-forward"
              title={'Showing last ' + showableRowsCount + ' rows'}
        />
        </span>
      );
    }

    //Column stuff https://github.com/cggh/panoptes/blob/1518c5d9bfab409a2f2dfbaa574946aa99919334/webapp/scripts/Utils/MiscUtils.js#L37
    //https://github.com/cggh/DQX/blob/efe8de44aa554a17ab82f40c1e421b93855ba83a/DataFetcher/DataFetchers.js#L573
    return (
      <Sidebar
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  onClick={() => setProps({sidebar: !sidebar})}
                  title={sidebar ? 'Expand' : 'Sidebar'}
            />
            <span className="block text"><QueryString prepend="Filter:" table={table} query={this.definedQuery}/></span>
            <span className="block text">Search: {searchText !== '' ? searchText : 'None'}</span>
            <span className="block text">Sort: {order ? this.tableConfig().propertiesById[order].name : 'None'} {order ? (ascending ? 'ascending' : 'descending') : null}</span>
            <span className="block text">{columns.length} of {this.tableConfig().properties.length} columns shown</span>
            <span className="block text">{pageBackwardNav}{shownRowsMessage}{pageForwardNav}</span>
          </div>
          <div className="grow">
            <DataTableView table={table}
                           query={dataTableQuery}
                           order={order}
                           ascending={ascending}
                           columns={columns}
                           columnWidths={columnWidths}
                           onColumnResize={this.handleColumnResize}
                           onOrderChange={this.handleOrderChange}
                           startRowIndex={startRowIndex}
                           onShowableRowsCountChange={this.handleShowableRowsCountChange}
                           onFetchedRowsCountChange={this.handleFetchedRowsCountChange}
                           onTotalRowsCountChange={this.handleTotalRowsCountChange}
              />
            </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = DataTableWithActions;
