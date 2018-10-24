import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Sidebar from 'ui/Sidebar';
import scrollbarSize from 'scrollbar-size';

// Lodash
import _clone from 'lodash.clone';
import _filter from 'lodash.filter';
import _map from 'lodash.map';
import _forEach from 'lodash.foreach';
import _assign from 'lodash.assign';

// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';

// Material UI
import Button from 'ui/Button';
import TextField from '@material-ui/core/TextField';
import Divider from '@material-ui/core/Divider';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import GroupedItemPicker from 'containers/GroupedItemPicker';
import Alert from 'ui/Alert';

// Panoptes
import DataTableView from 'panoptes/DataTableView';
import QueryString from 'panoptes/QueryString';
import SQL from 'panoptes/SQL';
import DataDownloader from 'util/DataDownloader';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';
import FilterButton from 'panoptes/FilterButton';
import PivotTableWithActions from 'containers/PivotTableWithActions';
import TablePlotActions from 'components/TablePlotActions';

let DataTableWithActions = createReactClass({
  displayName: 'DataTableWithActions',
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    setProps: PropTypes.func,
    title: PropTypes.string,
    table: PropTypes.string.isRequired,
    query: PropTypes.string,
    order: PropTypes.array,
    columns: PropTypes.array,
    columnWidths: PropTypes.object,
    initialStartRowIndex: PropTypes.number,
    sidebar: PropTypes.bool,
    initialSearchFocus: PropTypes.bool,
    searchText: PropTypes.string,
    maxRowsPerPage: PropTypes.number
  },

  // NB: We want to default to the tableConfig().defaultQuery, if there is one
  // Otherwise, default to SQL.nullQuery
  // But this.tableConfig() is not available to getDefaultProps()
  getDefaultProps() {
    return {
      table: null,
      query: undefined,
      order: [],
      columnWidths: {},
      initialStartRowIndex: 0,
      sidebar: true,
      initialSearchFocus: false,
      searchText: '',
      maxRowsPerPage: 250
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
      let filteredProps = val.visibleProperties;
      if (filteredProps.length > 0) {
        this.propertyGroups[key] = _clone(val);
        this.propertyGroups[key].properties = _map(filteredProps,
          ({id, name, description, icon}) => ({id, name, description, icon}));
      }
    });
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.state.searchOpen && this.props.searchText === '') {
      // Focus the searchField whenever the search is open and there is no searchText,
      // e.g. when opened from the Finder, or by clicking on the Find Text button.
      // FIXME: "Warning: Stateless function components cannot be given refs. Attempts to access this ref will fail."
      // <TextField ref={(input) => { this.searchField = input; }}
      // this.searchField.focus();
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

  handleOrderChange(order) {
    //Dont use merge syntax!
    this.props.setProps((props) => props.set('order', order));
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
    if (this.props.maxRowsPerPage !== undefined) {
      this.setState({startRowIndex: this.state.startRowIndex + this.props.maxRowsPerPage});
    } else {
      this.setState({startRowIndex: this.state.startRowIndex + this.state.showableRowsCount});
    }
  },

  handlePreviousPage() {

    let rowIndex = undefined;

    if (this.props.maxRowsPerPage !== undefined) {
      rowIndex = this.state.startRowIndex - this.props.maxRowsPerPage;
    } else {
      rowIndex = this.state.startRowIndex - this.state.showableRowsCount;
    }

    if (rowIndex < 0) {
      rowIndex = 0;
    }
    this.setState({startRowIndex: rowIndex});
  },

  handleFirstPage() {
    this.setState({startRowIndex: 0});
  },

  handleLastPage() {

    if (this.props.maxRowsPerPage !== undefined) {
      this.setState({startRowIndex: this.state.totalRowsCount - this.props.maxRowsPerPage});
    } else {
      this.setState({startRowIndex: this.state.totalRowsCount - this.state.showableRowsCount});
    }

  },

  handleDownload() {
    const {searchText} = this.props;
    DataDownloader(
      {
        dataset: this.config.dataset,
        table: this.props.table,
        tableConfig: this.tableConfig(),
        rowsCount: this.state.totalRowsCount,
        onLimitBreach: this.handleDownloadLimitBreach,
        query: searchText !== undefined && searchText !== '' ? this.createDataTableQuery() : this.getDefinedQuery(),
        columns: this.props.columns,
        order: this.props.order
      }
    );
  },

  handleDownloadLimitBreach(payload) {
    let {totalDataPoints, maxDataPoints} = payload;
    let message = `You have asked to download ${totalDataPoints} data points, which is more than our current limit of ${maxDataPoints}. Please use a stricter filter or fewer columns, or contact us directly.`;
    this.getFlux().actions.session.modalOpen(<Alert title="Warning" message={message}/>);
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

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  createDataTableQuery() {

    const {searchText} = this.props;

    // If there is searchText, then add the searchQuery to the base query, to form the dataTableQuery.
    let dataTableQuery = this.getDefinedQuery();
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
          _assign(searchQueryUnencoded, newOr);
        } else {
          searchQueryUnencoded.addComponent(newComponent);
        }

      }

      // Add the searchQuery to the base query, if the base query is not trivial.
      let baseQueryDecoded = SQL.WhereClause.decode(this.getDefinedQuery());
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

  orderDescriptionString(order) {
    if (order.length === 0) {
      return 'None';
    }
    return _map(order, ([dir, column]) =>
      `${this.tableConfig().propertiesById[column].name} ${dir === 'asc' ? 'asc' : 'desc'}`)
      .join(', ');
  },

  render() {

    let actions = this.getFlux().actions;
    let {table, columns, columnWidths, order, sidebar, setProps, searchText, maxRowsPerPage} = this.props;
    let {fetchedRowsCount, startRowIndex, showableRowsCount, searchOpen, totalRowsCount} = this.state;
    if (!columns) {
      columns = _filter(this.tableConfig().visibleProperties, (prop) => prop.showByDefault);
      columns = _map(columns, (prop) => prop.id);
    }

    let {description} = this.tableConfig();
    let quickFindFieldsList = '';
    for (let i = 0, len = this.tableConfig().quickFindFields.length; i < len; i++) {
      let quickFindField = this.tableConfig().quickFindFields[i];
      if (i == 0) quickFindFieldsList += 'Searching: ';
      if (i != 0) quickFindFieldsList += ', ';
      quickFindFieldsList += this.tableConfig().propertiesById[quickFindField].name;

    }
    let searchGUI = (
      <Button
        label="Find text"
        disabled={columns === undefined || columns.length === 0}
        color="primary"
        onClick={this.handleSearchOpen}
        iconName="search"
      />
    );
    if (searchOpen) {
      searchGUI = (
        <div>
          <Button
            raised="true"
            label="Find text"
            disabled={columns === undefined || columns.length === 0}
            color="primary"
            iconName="search"
            iconInverse={true}
          />
          <TextField
            fullWidth={true}
            label="Search"
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

    let columnPickerLabel = 'Pick columns';
    if (columns !== undefined && columns.length === this.tableConfig().visibleProperties.length) {
      columnPickerLabel = 'Hide columns';
    } else if (columns !== undefined && columns.length === 0) {
      columnPickerLabel = 'Show columns';
    }
    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={descriptionWithHTML}/>
        <FilterButton table={table} query={this.getDefinedQuery()} onPick={this.handleQueryPick}/>
        <Button
          label={columnPickerLabel}
          color="primary"
          onClick={() => actions.session.modalOpen(<GroupedItemPicker
            groups={this.propertyGroups}
            initialPick={columns}
            title={`Pick columns for ${this.tableConfig().capNamePlural} table`}
            onPick={this.handleColumnChange}
          />)}
          iconName="columns"
        />
        {searchGUI}
        <Divider />
        <Button
          label="Download data"
          disabled={columns === undefined || columns.length === 0}
          color="primary"
          onClick={() => this.handleDownload()}
          iconName="download"
        />
        <Button
          label="Pivot Table"
          color="primary"
          onClick={() => this.flux.actions.session.tabOpen(<PivotTableWithActions table={table} />, true)}
          iconName="table"
        />
        <Button
          label="Plot Table"
          color="primary"
          onClick={() => this.flux.actions.session.tabOpen(<TablePlotActions table={table} query={dataTableQuery}/>, true)}
          iconName="bar-chart"
        />
      </div>
    );

    let pageSizeInRows = maxRowsPerPage !== undefined ? maxRowsPerPage : showableRowsCount;

    let pageBackwardNav = null;
    if (startRowIndex != 0) {
      // Unless we are showing the first row, provide nav to previous rows.
      pageBackwardNav = (
        <span>
          <Icon className="pointer icon"
            name="fast-backward"
            title={`First ${pageSizeInRows} rows`}
            onClick={this.handleFirstPage}
          />
          <Icon className="pointer icon"
            name="step-backward"
            title={`Previous ${pageSizeInRows} rows`}
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
            title={`Showing first ${fetchedRowsCount} rows`}
          />
          <Icon className="pointer icon disabled"
            name="step-backward"
            title={`Showing first ${fetchedRowsCount} rows`}
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
    } else if (fetchedRowsCount != 0 && fetchedRowsCount < pageSizeInRows) {
      // If we're showing something and it's fewer than possible, assume we're showing the last rows.
      shownRowsMessage = <span className="text">Showing rows {startRowIndex + 1}–{startRowIndex + fetchedRowsCount} of {startRowIndex + fetchedRowsCount}</span>;
    } else if (fetchedRowsCount != 0 && fetchedRowsCount == pageSizeInRows) {
      // If we're showing something and it's all we can show, then there could be more or we might be showing the last lot.

      // What we're showing is less than we could possibly show, so it's safe to assume that we're showing the last lot.
      shownRowsMessage = <span className="text">Showing rows {startRowIndex + 1}–{startRowIndex + fetchedRowsCount} of {totalRowsCount}</span>;
    }

    let pageForwardNav = null;
    if (fetchedRowsCount != 0 && fetchedRowsCount == pageSizeInRows && (startRowIndex + pageSizeInRows < totalRowsCount)) {
      // If we are showing something and it's as many as possible, then provide nav to further rows.
      pageForwardNav = (
        <span>
          <Icon className="pointer icon"
            name="step-forward"
            title={`Next ${pageSizeInRows} rows`}
            onClick={this.handleNextPage}
          />
          <Icon className="pointer icon"
            name="fast-forward"
            title={`Last ${pageSizeInRows} rows`}
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
            title={`Showing last ${fetchedRowsCount} rows`}
          />
          <Icon className="pointer icon disabled"
            name="fast-forward"
            title={`Showing last ${pageSizeInRows} rows`}
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
              name={sidebar ? 'arrow-left' : 'bars'}
              onClick={() => setProps({sidebar: !sidebar})}
              title={sidebar ? 'Expand' : 'Sidebar'}
            />
            <span className="block text"><QueryString prefix="Filter: " table={table} query={this.getDefinedQuery()}/></span>
            <span className="block text">Search: {searchText !== '' ? searchText : 'None'}</span>
            <span className="block text">Sort: {this.orderDescriptionString(order)}</span>
            <span className="block text">{columns !== undefined ? columns.length : 0} of {this.tableConfig().visibleProperties.length} columns shown</span>
            <span className="block text">{pageBackwardNav}{pageForwardNav}{shownRowsMessage}</span>
          </div>
          <div className="grow">
            <DataTableView table={table}
              query={dataTableQuery}
              order={order}
              columns={columns}
              columnWidths={columnWidths}
              onColumnResize={this.handleColumnResize}
              onOrderChange={this.handleOrderChange}
              startRowIndex={startRowIndex}
              onShowableRowsCountChange={maxRowsPerPage !== undefined ? undefined : this.handleShowableRowsCountChange}
              onFetchedRowsCountChange={this.handleFetchedRowsCountChange}
              onTotalRowsCountChange={this.handleTotalRowsCountChange}
              maxRowsPerPage={maxRowsPerPage}
            />
          </div>
        </div>
      </Sidebar>
    );
  },
});

export default DataTableWithActions;
