import Handlebars from 'handlebars';
import _uniq from 'lodash.uniq';
import _map from 'lodash.map';
import _forEach from 'lodash.foreach';
import _isFunction from 'lodash.isfunction';

export default function(template, possibleTables, possibleParentTablesAndFields) {

  // For the given template, return the list of fields actually used in the template.
  // Note: only goes one level deep in terms of child fields - it will go deep for "if"s
  // Create a separate Handlebars instance.
  let hb = Handlebars.create();

  // Register helper functions to override the native Handlebar helpers.
  hb.registerHelper('helperMissing', function() {
    let args = [];
    let options = arguments[arguments.length - 1];
    for (let i = 0; i < arguments.length - 1; i++) {
      args.push(arguments[i]);
    }
    _map(args, (arg) => {
      if (arg && _isFunction(arg)) {
        arg();
      }
    });
  });

  hb.registerHelper('blockHelperMissing', function() {
    let args = [];
    let options = arguments[arguments.length - 1];
    for (let i = 0; i < arguments.length - 1; i++) {
      args.push(arguments[i]);
    }
    let {fn, inverse} = options;
    _map(args, (arg) => {
      if (arg && _isFunction(arg)) {
        arg();
      }
    });
    if (fn) {
      fn(this);
    }
    if (inverse) {
      inverse(this);
    }
  });

  hb.registerHelper('if', function(conditional, options) {
    if (conditional)
      conditional();
    options.fn(this);
    options.inverse(this);
  });

  hb.registerHelper('with', (context, options) => {
    if (context)
      context();
  });

  hb.registerHelper('each', function(context, options) {
    if (context)
      context();
    options.fn({});
    options.inverse(this);
  });

  hb.registerHelper('query', function() {
    let {fn, inverse, hash} = arguments[arguments.length-1];
    let {table, query, orderBy} = hash;
    table = table || '';
    query = query || '';
    orderBy = orderBy || '';
    Handlebars.compile(table)(this);
    Handlebars.compile(query)(this);
    Handlebars.compile(orderBy)(this);
    fn({});
    inverse(this);
  });

  // Compose a tracers object, where each key is the name of a possibleTable
  //   and each value is a function to add that field to the usedFields list.
  let tracers = {};
  let usedFields = [];
  possibleTables.forEach((field) => {
    tracers[field] = function() {
      usedFields.push(field);
    };
  });
  if (possibleParentTablesAndFields) {
    _forEach(possibleParentTablesAndFields, (fields, tableName) => {
        let fieldTracers = {};
        _forEach(fields, (field) =>
          fieldTracers[field] = () => usedFields.push(`${tableName}.${field}`));
        tracers[tableName] = fieldTracers;
      }
    );
  }

  // Compile the template.
  let compiledTemplate = hb.compile(template);

  // Provide the object of tracer functions as data to the compiled template.
  // Note: We don't need the returned HTML.
  // This has the effect of calling each tracer if/when it is used,
  //   thereby adding only used fields to the usedFields array.
  // Note: the same field might be added more than once.
  compiledTemplate(tracers);

  // Return the unique set of fields used in the template.
  return _uniq(usedFields);
}
