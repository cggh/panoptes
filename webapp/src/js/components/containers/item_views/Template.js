import React from 'react';
import ReactDOM from 'react-dom';
import _uniq from 'lodash/uniq';
import _each from 'lodash/each';
import HtmlToReact from 'html-to-react';
import Handlebars from 'handlebars';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Utils
import LRUCache from 'util/LRUCache';

// Panoptes components
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';

// UI components
import Loading from 'ui/Loading';
import HelloWorld from 'ui/HelloWorld';

import 'item_views/template.scss';

// TODO: Where to put Handlebars.tablesUsed?
Handlebars.tablesUsed = function(template, possibleTables) {

  // For the given template, return the list of tables actually used in the template.
  // Note: only goes one level deep, i.e. does not process nested logic blocks.

  // Create a separate Handlebars instance.
  let hb = Handlebars.create();

  // Register helper functions to override the native Handlebar helpers.

  // TODO: Explain what this actually does.

  hb.registerHelper('if', function(conditional, options) {
    if (conditional)
      conditional();
    options.fn(this);
    options.inverse(this);
  });

  hb.registerHelper('with', function(context, options) {
    if (context)
      context();
  });

  hb.registerHelper('each', function(context, options) {
    if (context)
      context();
  });

  hb.registerHelper('map', function(tableName, nameField, latField, longField) {
    // no op.
    // map 'tableName' 'nameField' 'latField' 'longField'
  });


  // Compose an tracers object, where each key is the name of a possibleTable
  //   and each value is a function to add that table to the usedTables list.
  let tracers = {};
  let usedTables = [];
  possibleTables.forEach(function(table) {
    tracers[table] = function() {
      usedTables.push(table);
    };
  });

  // Compile the template.
  let compiledTemplate = hb.compile(template);

  // Provide the object of tracer functions as data to the compiled template.
  // Note: We don't need the returned HTML.
  // This has the effect of calling each tracer if/when it is used,
  //   thereby adding only used tables to the usedTables array.
  // Note: the same table might be added more than once.
  compiledTemplate(tracers);

  // Return the unique set of tables used in the template.
  return _uniq(usedTables);
};


let TemplateTab = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('table', 'primKey')
  ],

  propTypes: {
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired
  },

  getInitialState() {
    return {
      loadStatus: 'loaded'
    };
  },

  fetchData(props, requestContext) {
    let {table, primKey, content, childTablesAsArrayOfMaps} = props;

    this.setState({loadStatus: 'loading'});

    // Extract all the childTableIds from the childTablesAsArrayOfMaps.
    let possibleChildTables = [];
    childTablesAsArrayOfMaps.forEach(function(map) {
      possibleChildTables.push(map.get('childtableid'));
    });

    // Determine which childTables are actually used in the raw template.
    let usedChildTables = Handlebars.tablesUsed(content, possibleChildTables);

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

  title() {
    return this.props.title;
  },

  componentDidUpdate() {

    // If there are template components to render...
    if (this.templateComponentsToRender) {
      _each(this.templateComponentsToRender, (component, id) => {
        ReactDOM.render(component, document.getElementById(id));
      });
    }

    // Only render the template components once.
    this.templateComponentsToRender = null;

  },

  render() {

    let {content} = this.props;
    let {data, loadStatus} = this.state;

    // Don't continue if there are no data.
    if (!data) return null;

    let thisReact = this;

    Handlebars.registerHelper( 'map', function(table, primKey, latProperty, lngProperty) {
      console.log('map table: %o', table);
      console.log('map primKey: %o', primKey);

      thisReact.templateComponentsToRender = {'map-container': <HelloWorld msg="hello" />};
      return new Handlebars.SafeString('<div id="map-container"></div>');

    });

    Handlebars.registerHelper( 'item_link', function(a, b, c) {
      // TODO: what is an item_link?
      return new Handlebars.SafeString('<a href="' + a + '/' + b + '" alt="' + b + '">' + c + '</a>');
    });

    // Compile and evaluate the template.
    let template = Handlebars.compile(content);
    let evaluatedContent = template(data);

    // Render the evaluated template HTML.
    let htmlToReactParser = new HtmlToReact.Parser(React);
    let reactContent = htmlToReactParser.parse('<div>' + evaluatedContent + '</div>');

    return (
        <div className="template-container">
          {reactContent}
          <Loading status={loadStatus}/>
        </div>
    );


  }

});

module.exports = TemplateTab;
