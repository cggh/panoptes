const Qajax = require('qajax');
const _ = require('lodash');
const LZString = require('lz-string');

const {assertRequired} = require('util/Assert');
const SQL = require('panoptes/SQL');
const DataDecoders = require('panoptes/DataDecoders');

const serverURL = "http://www.malariagen.net/apps/ag1000g/phase1-AR2/api";

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

function getRequestJSON(params = {}) {
  let url = `${serverURL}?`;
  _.forOwn(params, function (val, id) {
    url += `&${id}=${val}`;
  });
  return Qajax({url: url, method: "GET"})
    .then(Qajax.filterSuccess)
    .then(Qajax.toJSON)
    .then(filterError);
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
    limit: 1000000,
    distinct: false
  };
  let {database, table, columns, query, order,
    sortReverse, count, limit, distinct} = _.extend(defaults, options);

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
//    collist: LZString.compressToEncodedURIComponent(collist),
    collist: collist,
    order: order,
    sortreverse: sortReverse ? '1' : '0',
    needtotalcount: count ? '1' : '0',
    limit: '0~' + limit,
    distinct: distinct ? '1' : '0'
  })
    .then(decodeValList(columns));
}

module.exports = {
  serverURL: serverURL,
  getRequestJSON: getRequestJSON,
  pageQuery: pageQuery
};
