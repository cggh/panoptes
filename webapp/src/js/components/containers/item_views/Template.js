import React from 'react';
import ReactDOM from 'react-dom';
import _uniq from 'lodash/uniq';
import _each from 'lodash/each';
import HtmlToReact from 'html-to-react';
import Handlebars from 'handlebars';
import uid from 'uid';

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
import ItemLink from 'panoptes/ItemLink';

// UI components
import Loading from 'ui/Loading';

import ItemMapWidget from './ItemMap';

import 'item_views/template.scss';

// TODO: Where to put Handlebars.tablesUsed?
Handlebars.tablesUsed = function(template, possibleTables) {

  // For the given template, return the list of tables actually used in the template.
  // Note: only goes one level deep, i.e. does not process nested logic blocks.

  // Create a separate Handlebars instance.
  let hb = Handlebars.create();

  // Register helper functions to override the native Handlebar helpers.

  // TODO: Explain what this actually does.

  hb.registerHelper('if', (conditional, options) => {
    if (conditional)
      conditional();
    options.fn(this);
    options.inverse(this);
  });

  hb.registerHelper('with', (context, options) => {
    if (context)
      context();
  });

  hb.registerHelper('each', (context, options) => {
    if (context)
      context();
  });

  hb.registerHelper('map', (tableName, nameField, latField, longField) => {
    // no op.
    // map 'tableName' 'nameField' 'latField' 'longField'
  });


  // Compose a tracers object, where each key is the name of a possibleTable
  //   and each value is a function to add that table to the usedTables list.
  let tracers = {};
  let usedTables = [];
  possibleTables.forEach((table) => {
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


let TemplateWidget = React.createClass({

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
    childTablesAsArrayOfMaps.forEach((map) => {
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
        this.componentsToUnmountAtNode.push(document.getElementById(id));
      });
    }

    // Only render the template components once.
    this.templateComponentsToRender = null;

  },

  componentWillMount() {
    this.templateComponentsToRender = {};
    this.componentsToUnmountAtNode = [];
  },

  componentWillUnmount() {
    // https://facebook.github.io/react/blog/2015/10/01/react-render-and-top-level-api.html
    _each(this.componentsToUnmountAtNode, (node) => {
      ReactDOM.unmountComponentAtNode(node);
    });
  },

  render() {

    let {content, componentUpdate} = this.props;
    let {data, loadStatus} = this.state;

    // Don't continue if there are no data.
    if (!data) return null;

    let thisReact = this;

    Handlebars.registerHelper( 'map', (table, primKey, latProperty, lngProperty, width, height) => {

      width = width && !width instanceof Object ? width : '300px';
      height = height && !height instanceof Object ? height : '300px';

      let id = uid();
      thisReact.templateComponentsToRender[id] = <ItemMapWidget table={table} lngProperty={lngProperty} latProperty={latProperty} componentUpdate={componentUpdate} config={this.config} />;
      return new Handlebars.SafeString(`<div style="position: relative; width: ${width}; height: ${height};" id="${id}"></div>`);
    });

    Handlebars.registerHelper( 'item_link', (a, b, c) => {
      // TODO: what is an item_link?
      let id = uid();
      thisReact.templateComponentsToRender[id] = <ItemLink href={a} alt={b}>{c}</ItemLink>;
      return new Handlebars.SafeString(`<div id="${id}"></div>`);
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

module.exports = TemplateWidget;
