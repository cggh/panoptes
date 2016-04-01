import React from 'react';
import _uniq from 'lodash/uniq';
import Handlebars from 'handlebars/dist/handlebars.js';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Utils
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import templateFieldsUsed from 'util/templateFieldsUsed';

// Panoptes components
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';

// UI components
import Loading from 'ui/Loading';

import 'item_views/template.scss';


let ItemTemplate = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    children: React.PropTypes.string.isRequired,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired
  },

  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },

  fetchData(props, requestContext) {
    let {table, primKey, children, data } = props;
    if (data)
      return;
    this.setState({loadStatus: 'loading'});
    let relations = this.config.tables[table].relationsParentOf;
    // Extract all the childTableIds
    let possibleChildTables = [];
    let childField = {};
    relations.forEach((rel) => {
      possibleChildTables.push(rel.childtableid);
      childField[rel.childtableid] = rel.childpropid;
    });

    // Determine which childTables are actually used in the raw template.
    let usedChildTables = templateFieldsUsed(children, possibleChildTables);

    // Compose all the column specs for each table using the config data.
    let columnSpecsByTable = {};
    for (let i = 0, len = usedChildTables.length; i < len; i++) {
      let usedChildTable = usedChildTables[i];
      columnSpecsByTable[usedChildTable] = {};
      for (let property in this.config.tables[usedChildTable].propertiesMap) {
        // Don't include the StoredSelection property; otherwise the API call breaks. (TODO: why?)
        if (property === 'StoredSelection') continue;
        columnSpecsByTable[usedChildTable][property] = this.config.tables[usedChildTable].propertiesMap[property].defaultDisplayEncoding;
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
            columns: columnSpecsByTable[usedChildTableName]
          };
          return LRUCache.get(
            'pageQuery' + JSON.stringify(usedChildTableAPIargs), (cacheCancellation) =>
              API.pageQuery({cancellation: cacheCancellation, ...usedChildTableAPIargs}),
            componentCancellation
          );
        });

        // Push the API call for the data item record onto the array of promises.
        let mainTableAPIargs = {
          database: this.config.dataset,
          table: table,
          primKeyField: this.config.tables[table].primkey,
          primKeyValue: primKey
        };
        promises.push(
          LRUCache.get(
            'fetchSingleRecord' + JSON.stringify(mainTableAPIargs),
            (cacheCancellation) =>
              API.fetchSingleRecord({cancellation: cacheCancellation, ...mainTableAPIargs}),
            componentCancellation
          )
        );

        return Promise.all(promises);

      })
      .then((data) => {
        let templateData = data.pop();
        usedChildTables.map((tableName, index) => templateData[tableName] = data[index]);
        this.setState({loadStatus: 'loaded', data: templateData});
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((error) => {
        ErrorReport(this.getFlux(), error.message, () => this.fetchData(props));
        this.setState({loadStatus: 'error'});
      });
  },

  render() {
    let {children} = this.props;
    let {loadStatus} = this.state;
    let data = this.props.data || this.state.data;
    // Compile and evaluate the template.
    let template = Handlebars.compile(children);
    return (
      <div className="template-container">
        {data ? <HTMLWithComponents>
                  {template(data)}
                </HTMLWithComponents>
          : null}
        <Loading status={loadStatus}/>
      </div>
    );
  }
});

module.exports = ItemTemplate;
