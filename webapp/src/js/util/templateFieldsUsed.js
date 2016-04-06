import Handlebars from 'handlebars/dist/handlebars.js';
import _uniq from 'lodash/uniq';

export default function(template, possibleTables) {

  // For the given template, return the list of fields actually used in the template.
  // Note: only goes one level deep in terms of child fields - it will go deep for "if"s

  // Create a separate Handlebars instance.
  let hb = Handlebars.create();

  // Register helper functions to override the native Handlebar helpers.
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


  // Compose a tracers object, where each key is the name of a possibleTable
  //   and each value is a function to add that field to the usedFields list.
  let tracers = {};
  let usedFields = [];
  possibleTables.forEach((field) => {
    tracers[field] = function() {
      usedFields.push(field);
    };
  });

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
