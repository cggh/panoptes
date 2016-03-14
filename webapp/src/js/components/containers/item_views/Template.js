import React from 'react';
import _uniq from 'lodash/uniq';
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
import ComponentWrapper from 'panoptes/ComponentWrapper';

// UI components
import Loading from 'ui/Loading';

import ItemMapWidget from './ItemMap';


// Constants in this component
const DEFAULT_COMPONENT_WIDTH = '300px';
const DEFAULT_COMPONENT_HEIGHT = '300px';

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

  hb.registerHelper('map', () => {
    // no op.
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

  componentWillMount: function() {

    //// Register Handlebars Helpers

    Handlebars.registerHelper( 'item_link', (a, b, c) =>
      // TODO: what is an item_link?

      new Handlebars.SafeString(`<ItemLink href="${a}" alt="${b}">${c}</ItemLink>`)
    );

    Handlebars.registerHelper( 'map', (options) => {

      // http://handlebarsjs.com/expressions.html
      // "Handlebars helpers can also receive an optional sequence of key-value pairs as their final parameter (referred to as hash arguments in the documentation)"

      let {table, primKey, primKeyProperty, latProperty, lngProperty, width, height} = options.hash;

      console.log('width: ' + width);

      // Only "table" is strictly required.
      // If specified, primKey (a value) will identify a single record and map one marker.
      // If not specified, the {primKeyProperty, latProperty, lngProperty} fields will be determined by the table config.

      let primKeyAttrib = primKey !== undefined ? primKey : '';
      let primKeyPropertyAttrib = primKeyProperty !== undefined ? primKeyProperty : '';
      let lngPropertyAttrib = lngProperty !== undefined ? lngProperty : '';
      let latPropertyAttrib = latProperty !== undefined ? latProperty : '';

      // If width or height are not specified, use a default.
      width = width ? width : DEFAULT_COMPONENT_WIDTH;
      height = height ? height : DEFAULT_COMPONENT_HEIGHT;

      return new Handlebars.SafeString(`<ItemMapWidget table="${table}" primKey="${primKeyAttrib}" primKeyProperty="${primKeyPropertyAttrib}" lngProperty="${lngPropertyAttrib}" latProperty="${latPropertyAttrib}" width="${width}" height="${height}" />`);
    });




  },

  render() {

    let {content} = this.props;
    let {data, loadStatus} = this.state;
    // Don't continue if there are no data.
    if (!data) return null;

    // NOTE: There is a strong assumption that the template string (content) is static, i.e. it will not change during the life of the webapp.
    // For example: if we ever have WYSIWYG editors that can change the template, then we might have to take a different or more complicated approach.

    // Compile and evaluate the template.
    let template = Handlebars.compile(content);
    let evaluatedContent = template(data);


    //// Prepare the HtmlToReact node processing instructions
    let processNodeDefinitions = new HtmlToReact.ProcessNodeDefinitions(React);
    // Note: Instructions are processed in the order in which they are defined.
    let processingInstructions = [
      {
        shouldProcessNode: function(node) {
          return node.name === 'itemlink';
        },
        processNode: function(node, children) {
          let id = 'item_link_' + uid();
          return <ComponentWrapper key={id}><ItemLink {...node.attribs}>{children}</ItemLink></ComponentWrapper>;
        }
      },
      {
        shouldProcessNode: function(node) {
          return node.name === 'itemmapwidget';
        },
        processNode: function(node, children) {
          let id = 'map_' + uid();
          return <ComponentWrapper key={id}><ItemMapWidget {...node.attribs} /></ComponentWrapper>;
        }
      },
      {
        shouldProcessNode: function(node) {
          return true;
        },
        processNode: processNodeDefinitions.processDefaultNode
      }
    ];

    //// Render the evaluated template HTML.

    // Run the HtmlToReact parser
    let htmlToReactParser = new HtmlToReact.Parser(React);

    // TODO: Keep this as a placeholder?
    let isValidNode = function() { return true; };

    let reactContent = htmlToReactParser.parseWithInstructions('<div>' + evaluatedContent + '</div>', isValidNode, processingInstructions);

    return (
        <div className="template-container">
          {reactContent}
          <Loading status={loadStatus}/>
        </div>
    );


  }

});

module.exports = TemplateWidget;
