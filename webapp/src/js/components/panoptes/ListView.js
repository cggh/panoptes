import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOMServer from 'react-dom/server';
import Highlight from 'react-highlighter';
import _uniq from 'lodash.uniq';
import _keys from 'lodash.keys';
import striptags from 'striptags';
// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes components
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import ItemTemplate from 'panoptes/ItemTemplate';

// Utils
import LRUCache from 'util/LRUCache';
import templateFieldsUsed from 'util/templateFieldsUsed';

// Material UI components
import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';

let ListView = createReactClass({
  displayName: 'ListView',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table')
  ],

  propTypes: {
    icon: PropTypes.string,
    table: PropTypes.string.isRequired,
    selectedPrimKey: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
    search: PropTypes.string,
    autoSelectIfNoneSelected: PropTypes.bool,
    onRowsCountChange: PropTypes.func
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
    let tableConfig = this.config.tablesById[table];

    //Get at list of the columns we need to show the list
    let itemTitle = tableConfig.itemTitle || `{{${tableConfig.primKey}}}`;
    let columns = templateFieldsUsed(itemTitle, _keys(tableConfig.propertiesById));
    columns.push(this.config.tablesById[table].primKey);
    columns = _uniq(columns);

    this.setState({loadStatus: 'loading'});

    let queryAPIargs = {
      database: this.config.dataset,
      table: tableConfig.id,
      orderBy: [['asc', this.config.tablesById[table].primKey]],
      columns,
      start: 0,
      transpose: true
    };

    requestContext.request((componentCancellation) =>
      Promise.all([
        LRUCache.get(
          `query${JSON.stringify(queryAPIargs)}`,
          (cacheCancellation) =>
            API.query({cancellation: cacheCancellation, ...queryAPIargs}),
          componentCancellation
        ),
        LRUCache.get(
          `rowsCount${JSON.stringify(queryAPIargs)}`,
          (cacheCancellation) =>
            API.rowsCount({cancellation: cacheCancellation, ...queryAPIargs}),
          componentCancellation
        )
      ])
    )
      .then(([data, rowsCount]) => {
        if (autoSelectIfNoneSelected && !selectedPrimKey) {
          onSelect(data[0][tableConfig.primKey]);
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
        throw xhr;
      });
  },

  handleSelect(primKey, rowIndex) {
    this.props.onSelect(primKey);
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.props.onRowsCountChange && prevState.rowsCount !== this.state.rowsCount) {
      this.props.onRowsCountChange(this.state.rowsCount);
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
        let itemTemplate = (
          <ItemTemplate
            flux={this.flux}
            table={table}
            primKey={primKey}
            data={row}
            immediate={true}
          >
            {itemTitle}
          </ItemTemplate>
        );
        let content = search ? striptags(ReactDOMServer.renderToStaticMarkup(itemTemplate)).toLowerCase() : '';
        if (search && content.indexOf(search.toLowerCase()) !== -1 || !search) {
          listItems.push(

            <ListItem
              button
              className={className}
              key={primKey}
              onClick={() => this.handleSelect(primKey)}
            >
              {icon ?
                <ListItemIcon>
                  <Icon fixedWidth={true} name={icon}/>
                </ListItemIcon>
                : null
              }
              <ListItemText
                primary={
                  <Highlight search={search}>
                    {itemTemplate}
                  </Highlight>
                }
                secondary="Import and configure datasets"
              />
            </ListItem>
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
        <div style={{position: 'relative', height: '30px'}}>
          <Loading status="custom">No rows</Loading>
        </div>
      );
    }
  },
});

export default ListView;
