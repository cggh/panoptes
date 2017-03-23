import promisedHandlebars from 'promised-handlebars';
import Handlebars from 'handlebars';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';
import LRUCache from 'util/LRUCache';
import Q from 'q';
import _map from 'lodash/map';

const customHandlebars = (config) => {
  const hb = promisedHandlebars(Handlebars);
  hb.registerHelper('query', function () {
    let columns = [];
    let options = arguments[arguments.length - 1];
    for (let i = 0; i < arguments.length - 1; i++) {
      columns.push(arguments[i]);
    }
    let {fn, inverse, hash} = options;
    let {table, query, orderBy} = hash;
    query = query || SQL.nullQuery;
    orderBy = orderBy || null;
    table = Handlebars.compile(table)(this);
    query = Handlebars.compile(query)(this);
    if (orderBy) {
      try {
        orderBy = JSON.parse(Handlebars.compile(orderBy)(this));
      } catch (e){
        throw Error("orderBy should be a list of columns e.g. [['asc', 'col1'], ['desc', 'col2']] is currently: " + Handlebars.compile(orderBy)(this))
      }
    } else {
      orderBy = null
    }
    let queryAPIargs = {
      database: config.dataset,
      table: table,
      columns: columns,
      orderBy: orderBy,
      query: query,
      transpose: true //We want rows, not columns
    };
    return LRUCache.get(
      'query' + JSON.stringify(queryAPIargs),
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
          if (data) {
            data.index = index;
            data.first = index === 0;
            data.last = index === rows.length-1;
          }
          return fn(row, {data});
        })).then((fragments) => {
          let ret = '';
          for (let i = 0, l = fragments.length; i < l; i++) {
            ret += fragments[i];
          }
          return ret;
        });
      }
      else {
        return inverse(this)
      }
    })
  });
  return hb;
};




export default customHandlebars;

