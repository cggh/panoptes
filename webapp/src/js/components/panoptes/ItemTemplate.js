import React from 'react';
import customHandlebars from 'util/customHandlebars';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Utils
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import templateFieldsUsed from 'util/templateFieldsUsed';
import _map from 'lodash/map';

// Panoptes components
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';

// UI components
import Loading from 'ui/Loading';

import 'template.scss';


let ItemTemplate = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey', 'children')
  ],

  propTypes: {
    className: React.PropTypes.string,
    children: React.PropTypes.string.isRequired,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired,
    data: React.PropTypes.any
  },

  componentWillMount() {
    this.handlebars = customHandlebars(this.config);
  },
  onConfigChange() {
    this.handlebars = customHandlebars(this.config);
  },

  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },

  fetchData(props, requestContext) {
    let {table, primKey, children, data} = props;
    if (data) {
      this.handlebars.compile(children)({...data, config: this.config})
        .then((rendered) =>
          this.setState({
            rendered
          }));
      return;
    }
    this.setState({loadStatus: 'loading'});
    let relations = this.config.tablesById[table].relationsParentOf;
    // Extract all the childTableIds
    let possibleChildTables = [];
    let childField = {};
    relations.forEach((rel) => {
      possibleChildTables.push(rel.childTable.id);
      childField[rel.childTable.id] = rel.childPropId;
    });

    // Determine which childTables are actually used in the raw template.
    let usedChildTables = templateFieldsUsed(children, possibleChildTables);
    // Compose all the column specs for each table using the config data.
    let columnSpecsByTable = {};
    for (let i = 0, len = usedChildTables.length; i < len; i++) {
      let usedChildTable = usedChildTables[i];
      columnSpecsByTable[usedChildTable] = [];
      for (let property in this.config.tablesById[usedChildTable].propertiesById) {
        // Don't include the StoredSelection property; otherwise the API call breaks. (TODO: why?)
        if (property === 'StoredSelection') continue;
        columnSpecsByTable[usedChildTable].push(property);
      }
    }
    requestContext.request(
      (componentCancellation) => {
        // Add API calls for the used child tables onto an array of promises.
        let promises = usedChildTables.map((usedChildTableName) => {
          let usedChildTableAPIargs = {
            database: this.config.dataset,
            table: usedChildTableName,
            query: SQL.WhereClause.encode(
              SQL.WhereClause.CompareFixed(childField[usedChildTableName], '=', primKey)
            ),
            columns: columnSpecsByTable[usedChildTableName],
            transpose: true
          };
          return LRUCache.get(
            'query' + JSON.stringify(usedChildTableAPIargs), (cacheCancellation) =>
              API.query({cancellation: cacheCancellation, ...usedChildTableAPIargs}),
            componentCancellation
          );
        });

        // Push the API call for the data item record onto the array of promises.
        let APIargs = {
          database: this.config.dataset,
          table,
          columns: _map(this.config.tablesById[table].properties, 'id'),
          primKey: this.config.tablesById[table].primKey,
          primKeyValue: primKey
        };
        promises.push(
          LRUCache.get(
            'fetchSingleRecord' + JSON.stringify(APIargs),
            (cacheCancellation) =>
              API.fetchSingleRecord({cancellation: cacheCancellation, ...APIargs}),
            componentCancellation
          )
        );

        return Promise.all(promises);

      })
      .then((data) => {
        let templateData = data.pop();
        usedChildTables.map((tableName, index) => templateData[tableName] = data[index]);
        return templateData;
      })
      .then((data) => {
        this.handlebars.compile(children)({...data, config: this.config})
          .then((rendered) =>
            this.setState({
              loadStatus: 'loaded',
              rendered
            }));
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
        this.setState({loadStatus: 'error'});
      });
  },

  render() {
    let {loadStatus, rendered} = this.state;
    return (
      <span className={this.props.className}>
        {rendered ? <HTMLWithComponents className="item-template">
                  {rendered}
                </HTMLWithComponents>
          : null}
        <Loading status={loadStatus}/>
      </span>
    );
  }
});

export default ItemTemplate;
