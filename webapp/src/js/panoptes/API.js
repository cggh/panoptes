const Qajax = require('qajax');
const _ = require('lodash');
const LZString = require('lz-string');

const {assertRequired} = require('util/Assert');
const SQL = require('panoptes/SQL');
const DataDecoders = require('panoptes/DataDecoders');
const Base64 = require('panoptes/Base64');

const serverURL = initialConfig.serverURL;

//TODO: Refactor server errors to closer to HTTP standard
function filterError(json) {
  if (typeof(json) !== 'object') {
    if (json.indexOf('Authentication') > 0)
      throw Error('Client is not authenticated');
    throw Error('Invalid server response type');
  }
  if ('Error' in json) {
    if (json.Error == 'NotAuthenticated') {
      throw Error("Not Authenticated");
    }
    else
      throw Error(`Error: ${json.Error}`);
  }
  return Promise.resolve(json);
}

function requestJSON(method, params = {}, data = null) {
  let url = `${serverURL}?`;
  _.forOwn(params, function (val, id) {
    url += `&${id}=${val}`;
  });
  return Qajax({url: url, method: method, data:data})
    .then(Qajax.filterSuccess)
    .then(Qajax.toJSON)
    .then(filterError)
    .catch(err => {
    throw Error(`There was a problem with a request to the server: ${err.statusText}`)
  })
}

function getRequestJSON(params = {}) {
  return requestJSON("GET", params);
}
function postRequestJSON(params = {}, data = null) {
  return requestJSON("POST", params, data);
}


function decodeValList(columns) {
  return function (json_response) {
    let vallistdecoder = DataDecoders.ValueListDecoder();
    let ret = {};
    _.each(columns, (encoding, id) =>
        ret[id] = vallistdecoder.doDecode(json_response[id])
    );
    return ret;
  }
}

function pageQuery(options) {
  assertRequired(options, ['database', 'table', 'columns']);
  let defaults = {
    query: SQL.WhereClause.Trivial(),
    order: null,
    sortReverse: false,
    count: false,
    start: 0,
    stop: 1000000,
    distinct: false
  };
  let {database, table, columns, query, order,
    sortReverse, count, start, stop, distinct} = _.extend(defaults, options);

  let collist = "";
  _.each(columns, (encoding, id) => {
    if (collist.length > 0) collist += "~";
    collist += encoding + id;
  });

  return getRequestJSON({
    datatype: 'pageqry',
    database: database,
    tbname: table,
    qry: SQL.WhereClause.encode(query),
    collist: LZString.compressToEncodedURIComponent(collist),
    order: order,
    sortreverse: sortReverse ? '1' : '0',
    needtotalcount: count ? '1' : '0',
    limit: `${start}~${stop}`,
    distinct: distinct ? '1' : '0'
  })
    .then(decodeValList(columns))
    .then((columns) => {
      let rows = [];
      for (let i=0;i < columns[_.keys(columns)[0]].length; i++) {
        let row = {};
        _.each(columns, (array, id) => row[id] = array[i]);
        rows.push(row);
      }
      return rows;
    });
}

function storeData(data) {
  data = Base64.encode(JSON.stringify(data));
  return postRequestJSON({datatype: 'storedata'}, data).then((resp) => resp.id);
}

module.exports = {
  serverURL: serverURL,
  getRequestJSON: getRequestJSON,
  pageQuery: pageQuery,
  storeData: storeData
};
