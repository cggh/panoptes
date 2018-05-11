import promisedHandlebars from 'promised-handlebars';
import Handlebars from 'handlebars';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';
import LRUCache from 'util/LRUCache';
import Q from 'q';
import _map from 'lodash.map';
import _forEach from 'lodash.foreach';
import handlebarsHelpers from 'handlebars-helpers';
import resolveJoins from 'panoptes/resolveJoins';
import {propertyColour,isColourDark} from 'util/Colours';

const customHandlebars = ({dataset, tablesById, handlebars, constants}) => {
  let hb = handlebars || promisedHandlebars(Handlebars);
  hb.registerHelper('colour', function() {
    const [table, property, value] = arguments;
    return propertyColour(tablesById[table].propertiesById[property])(value);
  });
  hb.registerHelper('visibleColour', function() {
    const [table, property, value] = arguments;
    return isColourDark(propertyColour(tablesById[table].propertiesById[property])(value)) ? '#F0F0F0' : '#101010';
  });
  hb.registerHelper('constant', function() {
    return constants[arguments[0]];
  });
  hb.registerHelper('concat', function() {
    // NOTE: Might be rendered obsolete by https://github.com/helpers/handlebars-helpers#append
    // Credit: https://gist.github.com/adg29/f312d6fab93652944a8a1026142491b1
    let str = '';
    for (let arg in arguments) {
      if (typeof arguments[arg] === 'string') {
        str += arguments[arg];
      }
    }
    return str;
  });
  hb.registerHelper('eval', function() {
    let text = arguments[0];
    let options = arguments[arguments.length - 1];
    let {data} = options;
    if (data) {
      data = hb.createFrame(data);
    }
    return typeof text === 'string' ? hb.compile(text)(this, {data}) : undefined;
  });
  hb.registerHelper('query', function() {
    let columns = [];
    let options = arguments[arguments.length - 1];
    let {fn, inverse, hash, data} = options;
    let {table, query, orderBy, distinct, joins, groupBy, start, stop, expression} = hash;
    if (data) {
      data = hb.createFrame(data);
    }
    for (let i = 0; i < arguments.length - 1; i++) {
      columns.push(Handlebars.compile(arguments[i])(this, {data}));
    }
    query = query || SQL.nullQuery;
    distinct = distinct === 'true' ? true : false;

    // NOTE: "You must pass a string or Handlebars AST to Handlebars.compile."
    // Except undefined is acceptable.
    table = typeof table === 'string' ? Handlebars.compile(table)(this, {data}) : undefined;
    query = typeof query === 'string' ? Handlebars.compile(query)(this, {data}) : undefined;
    joins = typeof joins === 'string' ? Handlebars.compile(joins)(this, {data}) : undefined;
    start = typeof start === 'string' ? Handlebars.compile(start)(this, {data}) : undefined;
    stop = typeof stop === 'string' ? Handlebars.compile(stop)(this, {data}) : undefined;

    if (typeof joins === 'string') {
      try {
        joins = JSON.parse(joins);
      } catch (e) {
        throw Error(`Handlebars query joins is not JSON-parsable: ${Handlebars.compile(joins)(this)}`);
      }
    } else {
      joins = undefined;
    }

    if (typeof expression === 'string') {
      try {
        // TODO: Support handlebars in expression.
        expression = JSON.parse(expression);
        columns.push({expr: expression, as: 'expression'});
      } catch (e) {
        throw Error(`Handlebars query expression is not JSON-parsable: ${Handlebars.compile(expression)(this)}`);
      }
    } else {
      expression = undefined;
    }

    if (typeof orderBy === 'string') {
      try {
        orderBy = JSON.parse(Handlebars.compile(orderBy)(this, {data}));
      } catch (e) {
        throw Error(`Handlebars query orderBy should be a list of columns, e.g. [["asc", "col1"], ["desc", "col2"]], but it is currently: ${Handlebars.compile(orderBy)(this)}`);
      }
    } else {
      orderBy = '';
    }

    if (typeof groupBy === 'string') {
      try {
        groupBy = JSON.parse(Handlebars.compile(groupBy)(this, {data}));
      } catch (e) {
        throw Error(`Handlebars query groupBy should be a list of columns, e.g. ["foo", "bar"], but it is currently: ${Handlebars.compile(groupBy)(this)}`);
      }
    } else {
      groupBy = []; // API attempts groupBy.join('~')
    }

    // API asserts (_isNumber(start) && _isNumber(stop)), which would fail for strings.
    let startParsed = undefined;
    if (start !== undefined) {
      startParsed = parseInt(start);
      if (Number.isNaN(startParsed)) {
        throw Error(`Handlebars query start should be a parsable integer, e.g. 1 or '2', but it is currently: ${start}`);
      }
    }
    let stopParsed = undefined;
    if (stop !== undefined) {
      stopParsed = parseInt(stop);
      if (Number.isNaN(stopParsed)) {
        throw Error(`Handlebars query stop should be a parsable integer, e.g. 1 or '2', but is currently: ${stop}`);
      }
    }

    let queryAPIargs = {
      database: dataset,
      table,
      columns,
      orderBy,
      distinct,
      query,
      transpose: true, //We want rows, not columns
      joins,
      groupBy,
      start: startParsed,
      stop: stopParsed
    };
    queryAPIargs = resolveJoins(queryAPIargs, {tablesById});
    return LRUCache.get(
      `query${JSON.stringify(queryAPIargs)}`,
      (cacheCancellation) =>
        API.query({cancellation: cacheCancellation, ...queryAPIargs}),
      Q.defer().promise  //For now don't support cancellation
    )
      .then((rows) => {
        if (rows.length) {
          let data = null;
          if (options.data) {
            data = hb.createFrame(options.data);
          }
          return Promise.all(_map(rows, (row, index) => {
            //We need to unpack data from related tables
            _forEach(row, (value, key) => {
              if (key.indexOf('.') !== -1) {
                let [table, col] = key.split('.');
                row[table] = row[table] || {};
                row[table][col] = value;
              }
            });

            if (data) {
              data.index = index;
              data.first = index === 0;
              data.last = index === rows.length - 1;
              data.penultimate = index === rows.length - 2;
            }
            return fn(row, {data});
          })).then((fragments) => {
            let ret = '';
            for (let i = 0, l = fragments.length; i < l; i++) {
              ret += fragments[i];
            }
            return ret;
          });
        } else {
          return inverse(this);
        }
      });
  });
  handlebarsHelpers.array({handlebars: hb});
  handlebarsHelpers.code({handlebars: hb});
  handlebarsHelpers.collection({handlebars: hb});
  handlebarsHelpers.comparison({handlebars: hb});
  handlebarsHelpers.date({handlebars: hb});
  handlebarsHelpers.html({handlebars: hb});
  handlebarsHelpers.i18n({handlebars: hb});
  handlebarsHelpers.inflection({handlebars: hb});
  handlebarsHelpers.match({handlebars: hb});
  handlebarsHelpers.math({handlebars: hb});
  handlebarsHelpers.misc({handlebars: hb});
  handlebarsHelpers.number({handlebars: hb});
  handlebarsHelpers.object({handlebars: hb});
  handlebarsHelpers.string({handlebars: hb});
  handlebarsHelpers.url({handlebars: hb});
  return hb;
};




export default customHandlebars;
