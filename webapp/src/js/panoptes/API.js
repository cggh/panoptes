import qajax from 'qajax';
import _ from 'lodash';
import LZString from 'lz-string';

import {assertRequired} from 'util/Assert';
import SQL from 'panoptes/SQL';
import DataDecoders from 'panoptes/DataDecoders';
import Base64 from 'panoptes/Base64';

//Global for now
const serverURL = initialConfig.serverURL; //eslint-disable-line no-undef

//TODO: Refactor server errors to closer to HTTP standard
function _filterError(json) {
  if (typeof (json) !== 'object') {
    if (json.indexOf('Authentication') > 0)
      throw Error('Client is not authenticated');
    throw Error('Invalid server response type');
  }
  if ('Error' in json) {
    if (json.Error == 'NotAuthenticated') {
      throw Error('Not Authenticated');
    }
    else
      throw Error(`Error: ${json.Error}`);
  }
  return json;
}

function filterAborted(xhr) {
  if (xhr.status === 0 && xhr.readyState == 0)  //This seems to be the only way to detect the cancel
    return ('__SUPERSEEDED__');
  else
    throw xhr;
}

function errorMessage(xhr) {
  return `There was a problem with a request to the server: ${xhr.statusText || xhr.message}`;
}



function requestJSON(options) {
  let defaults = {
    url: serverURL,
    method: 'GET',
    params: {},
    timeout: 60000,
    data: null
  };

  //We could use the shiny new Fetch API here - but as there is no "abort" for that currently we stick with qajax.
  return qajax(Object.assign(defaults, options))
    .then(qajax.filterSuccess)
    .then(qajax.toJSON)
    .then(_filterError);
}

function _decodeValList(columns) {
  return function(jsonResponse) {
    let vallistdecoder = DataDecoders.ValueListDecoder();
    let ret = {};
    _.each(columns, (encoding, id) =>
      ret[id] = vallistdecoder.doDecode(jsonResponse[id])
    );
    return ret;
  };
}

function _decodeSummaryList(columns) {
  return function(jsonResponse) {
    let ret = {};
    _.each(columns, (column, key) => {
      let data = jsonResponse.results[`${column.folder}_${column.config}_${column.name}`];
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
    query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
    order: null,
    ascending: false,
    count: false,
    start: 0,
    stop: 1000000,
    distinct: false
  };
  let {database, table, columns, query, order,
    ascending, count, start, stop, distinct} = Object.assign(defaults, options);

  let collist = '';
  _.each(columns, (encoding, id) => {
    if (collist.length > 0) collist += '~';
    collist += encoding + id;
  });
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON(Object.assign(args, {
    params: {
      datatype: 'pageqry',
      database: database,
      tbname: table,
      qry: query,
      collist: LZString.compressToEncodedURIComponent(collist),
      order: order,
      sortreverse: ascending ? '1' : '0',
      needtotalcount: count ? '1' : '0',
      limit: `${start}~${stop}`,
      distinct: distinct ? '1' : '0'
    }
  }))
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
  let {chromosome, columns, blocksize, blockstart, blockcount} = Object.assign(defaults, options);

  let collist = '';
  _.each(columns, (column) => {
    if (collist.length > 0) collist += '~';
    collist += `${column.folder}~${column.config}~${column.name}`;
  });

  return requestJSON({
    params: {
      datatype: 'summinfo',
      dataid: chromosome,
      ids: collist,
      blocksize: blocksize,
      blockstart: blockstart,
      blockcount: blockcount
    }
  })
    .then(_decodeSummaryList(columns));
}


function storeData(data) {
  data = Base64.encode(JSON.stringify(data));
  return requestJSON({
    method: 'POST',
    params: {datatype: 'storedata'},
    data: data
  }).then((resp) => resp.id);
}

function fetchData(id) {
  return requestJSON({
    params: {datatype: 'fetchstoredata', id: id}
  }).then((resp) => JSON.parse(Base64.decode(resp.content)));
}

function fetchSingleRecord(options) {
  assertRequired(options, ['database', 'table', 'primKeyField', 'primKeyValue']);
  let {database, table, primKeyField, primKeyValue} = options;
  return requestJSON({
    params: {
      datatype: 'recordinfo',
      database: database,
      tbname: table,
      qry: SQL.WhereClause.encode(SQL.WhereClause.CompareFixed(primKeyField, '=', primKeyValue))
    }
  }).then((response) => response.Data);
}

module.exports = {
  serverURL: serverURL,
  filterAborted: filterAborted,
  errorMessage: errorMessage,
  requestJSON: requestJSON,
  pageQuery: pageQuery,
  storeData: storeData,
  fetchData: fetchData,
  summaryData: summaryData,
  fetchSingleRecord: fetchSingleRecord
};
