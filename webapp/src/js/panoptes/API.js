const Q = require('q');
const Qajax = require('qajax');
const _ = require('lodash');
const LZString = require('lz-string');

const {assertRequired} = require('util/Assert');
const SQL = require('panoptes/SQL');
const DataDecoders = require('panoptes/DataDecoders');
const Base64 = require('panoptes/Base64');

const serverURL = initialConfig.serverURL;

//TODO: Refactor server errors to closer to HTTP standard
function _filterError(json) {
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
  return json;
}

function requestJSON(method, params = {}, data = null) {
  let url = `${serverURL}?`;
  _.forOwn(params, function (val, id) {
    url += `&${id}=${val}`;
  });
  return Qajax({url: url, method: method, data: data})
    .then(Qajax.filterSuccess)
    .then(Qajax.toJSON)
    .then(_filterError)
    .catch(err => {
      throw Error(`There was a problem with a request to the server: ${err.statusText || err.message}`)
    });
}

function getRequestJSON(params = {}) {
  return requestJSON("GET", params);
}
function postRequestJSON(params = {}, data = null) {
  return requestJSON("POST", params, data);
}


function _decodeValList(columns) {
  return function (json_response) {
    let vallistdecoder = DataDecoders.ValueListDecoder();
    let ret = {};
    _.each(columns, (encoding, id) =>
        ret[id] = vallistdecoder.doDecode(json_response[id])
    );
    return ret;
  }
}

function _decodeSummaryList(columns) {
  return function (json_response) {
    let ret = {};
    _.each(columns, (column, key) => {
        let data = json_response.results[`${column.folder}_${column.config}_${column.name}`];
        //For better or worse we imitate the original behaviour of passing on a lack of data
        if (data)
          ret[key] = DataDecoders.Encoder.Create(data.encoder).decodeArray(data.data);
        else
          ret[key] = null;
      }
    );
    return ret;
  };
}


function pageQuery(options) {
  assertRequired(options, ['database', 'table', 'columns']);
  let defaults = {
    query: SQL.WhereClause.Trivial(),
    order: null,
    ascending: false,
    count: false,
    start: 0,
    stop: 1000000,
    distinct: false
  };
  let {database, table, columns, query, order,
    ascending, count, start, stop, distinct} = _.extend(defaults, options);

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
    sortreverse: ascending ? '1' : '0',
    needtotalcount: count ? '1' : '0',
    limit: `${start}~${stop}`,
    distinct: distinct ? '1' : '0'
  })
    .then(_decodeValList(columns))
    //Transpose into rows
    .then((columns) => {
      let rows = [];
      for (let i = 0; i < columns[_.keys(columns)[0]].length; i++) {
        let row = {};
        _.each(columns, (array, id) => row[id] = array[i]);
        rows.push(row);
      }
      return rows;
    });
}

function summaryData(options) {
  assertRequired(options, ['chromosome', 'columns', 'blocksize', 'blockstart', 'blockcount']);
  let defaults = {};
  let {chromosome, columns, blocksize, blockstart, blockcount} = _.extend(defaults, options);

  let collist = "";
  _.each(columns, (column) => {
    if (collist.length > 0) collist += "~";
    collist += `${column.folder}~${column.config}~${column.name}`;
  });

  return getRequestJSON({
    datatype: 'summinfo',
    dataid: chromosome,
    ids: collist,
    blocksize: blocksize,
    blockstart: blockstart,
    blockcount: blockcount
  })
    .then(_decodeSummaryList(columns))
    .delay(0);
}


function storeData(data) {
  data = Base64.encode(JSON.stringify(data));
  return postRequestJSON({datatype: 'storedata'}, data).then((resp) => resp.id);
}

function fetchData(id) {
  return getRequestJSON({datatype: 'fetchstoredata', id: id}).then((resp) => JSON.parse(Base64.decode(resp.content)));
}

function fetchSingleRecord(options) {
  assertRequired(options, ['database', 'table', 'primKeyField', 'primKeyValue']);
  let {database, table, primKeyField, primKeyValue} = options;
  return getRequestJSON({
    datatype: 'recordinfo',
    database: database,
    tbname: table,
    qry: SQL.WhereClause.encode(SQL.WhereClause.CompareFixed(primKeyField, '=', primKeyValue))
  }).then((response) => response.Data)
}

module.exports = {
  serverURL: serverURL,
  getRequestJSON: getRequestJSON,
  pageQuery: pageQuery,
  storeData: storeData,
  fetchData: fetchData,
  summaryData: summaryData,
  fetchSingleRecord: fetchSingleRecord
};
