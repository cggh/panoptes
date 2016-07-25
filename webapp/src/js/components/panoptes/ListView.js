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
    onTruncatedRowsCountChange: React.PropTypes.func
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
      truncatedRowsCount: 0
    };
  },


  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    let {table, autoSelectIfNoneSelected, onSelect, selectedPrimKey} = props;
    let tableConfig = this.config.tablesById[table];

    //Get at list of the columns we need to show the list
    let itemTitle = tableConfig.itemTitle || `{{${tableConfig.primKey}}}`;
    let columns = templateFieldsUsed(itemTitle, _keys(tableConfig.propertiesById));
    columns.push(this.config.tablesById[table].primKey);
    columns = _uniq(columns);

    let columnspec = {};
    columns.map((column) => columnspec[column] = tableConfig.propertiesById[column].defaultDisplayEncoding);
    this.setState({loadStatus: 'loading'});

    let pageQueryAPIargs = {
      database: this.config.dataset,
      table: tableConfig.fetchTableName,
      columns: columnspec,
      start: 0
    };

    let truncatedRowsCountAPIargs = {
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
          'truncatedRowsCount' + JSON.stringify(truncatedRowsCountAPIargs),
          (cacheCancellation) =>
            API.truncatedRowsCount({cancellation: cacheCancellation, ...truncatedRowsCountAPIargs}),
          componentCancellation
        )
      ])
    )
    .then(([data, truncatedRowsCount]) => {
      if (autoSelectIfNoneSelected && !selectedPrimKey) {
        onSelect(data[0][tableConfig.primKey]);
      }
      this.setState({
        loadStatus: 'loaded',
        rows: data,
        truncatedRowsCount
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
    if (this.props.onTruncatedRowsCountChange && prevState.truncatedRowsCount !== this.state.truncatedRowsCount) {
      this.props.onTruncatedRowsCountChange(this.state.truncatedRowsCount);
    }
  },

  render() {
    let {icon, table, search, selectedPrimKey} = this.props;
    let {loadStatus, rows} = this.state;

    let tableConfig = this.config.tablesById[table];
    let itemTitle = tableConfig.itemTitle || `{{${tableConfig.primKey}}}`;

    if (!tableConfig) {
      console.error(`Error: table ${table} has no associated config.`);
      return null;
    }

    if (rows.length > 0) {

      let listItems = [];

      rows.map((row) => {

        let primKey = row[tableConfig.primKey];
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
