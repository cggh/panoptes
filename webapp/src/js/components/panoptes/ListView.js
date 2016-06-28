import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Highlight from 'react-highlighter';
import _uniq from 'lodash/uniq';
import _keys from 'lodash/keys';
import striptags from 'striptags';
// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes components
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';
import ItemTemplate from 'panoptes/ItemTemplate';

// Utils
import LRUCache from 'util/LRUCache';
import templateFieldsUsed from 'util/templateFieldsUsed';

// Material UI components
import {List, ListItem} from 'material-ui/List';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';

let ListView = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table')
  ],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    selectedPrimKey: React.PropTypes.string,
    onSelect: React.PropTypes.func.isRequired,
    search: React.PropTypes.string,
    autoSelectIfNoneSelected: React.PropTypes.bool,
    onRowsCountChange: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      table: null,
      initialSelectedIndex: 0,
      search: ''
    };
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded',
      rowsCount: 0
    };
  },


  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {table, autoSelectIfNoneSelected, onSelect, selectedPrimKey} = props;
    let tableConfig = this.config.tables[table];

    //Get at list of the columns we need to show the list
    let itemTitle = tableConfig.settings.itemTitle || `{{${tableConfig.primkey}}}`;
    let columns = templateFieldsUsed(itemTitle, _keys(tableConfig.propertiesMap));
    columns.push(this.config.tables[table].primkey);
    columns = _uniq(columns);

    let columnspec = {};
    columns.map((column) => columnspec[column] = tableConfig.propertiesMap[column].defaultDisplayEncoding);
    this.setState({loadStatus: 'loading'});

    let pageQueryAPIargs = {
      database: this.config.dataset,
      table: tableConfig.fetchTableName,
      columns: columnspec,
      start: 0
    };

    let recordCountAPIargs = {
      database: this.config.dataset,
      table: tableConfig.fetchTableName
    };

    requestContext.request((componentCancellation) =>
      Promise.all([
        LRUCache.get(
          'pageQuery' + JSON.stringify(pageQueryAPIargs),
          (cacheCancellation) =>
            API.pageQuery({cancellation: cacheCancellation, ...pageQueryAPIargs}),
          componentCancellation
        ),
        LRUCache.get(
          'recordCount' + JSON.stringify(recordCountAPIargs),
          (cacheCancellation) =>
            API.recordCount({cancellation: cacheCancellation, ...recordCountAPIargs}),
          componentCancellation
        )
      ])
    )
    .then(([data, rowsCount]) => {
      if (autoSelectIfNoneSelected && !selectedPrimKey) {
        onSelect(data[0][tableConfig.primkey]);
      }
      this.setState({
        loadStatus: 'loaded',
        rows: data,
        rowsCount
      });
    })
    .catch(API.filterAborted)
    .catch(LRUCache.filterCancelled)
    .catch((xhr) => {
      ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
      this.setState({loadStatus: 'error'});
    });
  },

  handleSelect(primKey, rowIndex) {
    this.props.onSelect(primKey);
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (this.props.onRowsCountChange && prevState.rowsCount !== this.state.rowsCount) {
      this.props.onRowsCountChange(this.state.rowsCount);
    }
  },

  render() {
    let {icon, table, search, selectedPrimKey} = this.props;
    let {loadStatus, rows} = this.state;

    let tableConfig = this.config.tables[table];
    let itemTitle = tableConfig.settings.itemTitle || `{{${tableConfig.primkey}}}`;

    if (!tableConfig) {
      console.error(`Error: table ${table} has no associated config.`);
      return null;
    }

    if (rows.length > 0) {

      let listItems = [];

      rows.map((row) => {

        let primKey = row[tableConfig.primkey];
        let className = selectedPrimKey !== primKey ? 'picked' : '';

        let content = search ? striptags(ReactDOMServer.renderToStaticMarkup(
          <ItemTemplate config={this.config} table={table} primKey={primKey} data={row}>
            {itemTitle}
          </ItemTemplate>
        )).toLowerCase() : '';
        if (search && content.indexOf(search) !== -1 || !search) {
          listItems.push(
            <ListItem className={className}
                      key={primKey}
                      primaryText={
                          <Highlight search={search}>
                            <ItemTemplate table={table} primKey={primKey} data={row}>
                              {itemTitle}
                            </ItemTemplate>
                          </Highlight>
                      }
                      onClick={() => this.handleSelect(primKey)}
                      leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
            />
          );
        }

      });


      return (
        <div>
          <List>
            {listItems}
          </List>
          <Loading status={loadStatus}/>
        </div>
      );

    } else {
      return (
        <div>
          <Loading status="custom">No rows</Loading>
        </div>
      );
    }
  }

});

module.exports = ListView;
