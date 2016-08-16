import qajax from 'qajax';
import arrayBufferDecode from 'panoptes/arrayBufferDecode';
import _keys from 'lodash/keys';
import LZString from 'lz-string';
import _forEach from 'lodash/forEach';
import {assertRequired} from 'util/Assert';
import SQL from 'panoptes/SQL';
import DataDecoders from 'panoptes/DataDecoders';
import Base64 from 'panoptes/Base64';

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
    } else {
      throw Error(`Error: ${json.Error}`);
    }
  }
  if ('issue' in json) {
    throw Error(json.issue);
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
  return `Error: ${xhr.statusText || xhr.message}`;
}

function encodeQuery(query) {
  let st = Base64.encode(query);
  st = st.replace(/\+/g, '-');
  st = st.replace(/\//g, '_');
  if (Base64.decode(st) != query) {
    throw Error('Invalid encoding');
  }
  return st;
}

function request(options, method = 'GET', data = null) {
  let defaults = {
    url: initialConfig.serverURL, //eslint-disable-line no-undef
    method: method,
    params: {},
    timeout: 60000,
    data: data
  };
  //Remove null params
  for (let key in options.params) {
    if (options.params[key] === null) {
      delete options.params[key];
    }
  }
  //We could use the shiny new Fetch API here - but as there is no "abort" for that currently we stick with qajax.
  return qajax(Object.assign(defaults, options))
    .then(qajax.filterSuccess);
}

function requestJSON(options, method = 'GET', data = null) {
  return request(options, method, data)
    .then(qajax.toJSON)
    .then(_filterError);
}

function requestArrayBuffer(options, method = 'GET', data = null) {
  options.responseType = "arraybuffer";
  return request(options, method, data)
    .then(({response}) => arrayBufferDecode(response));
}

function _decodeValList(columns) {
  return function (jsonResponse) {
    let vallistdecoder = DataDecoders.ValueListDecoder();
    let ret = {};
    _forEach(columns, (encoding, id) =>
      ret[id] = vallistdecoder.doDecode(jsonResponse[id])
    );
    return ret;
  };
}

function _decodeSummaryList(columns) {
  return function (jsonResponse) {
    let ret = {};
    _forEach(columns, (column, key) => {
        let data = jsonResponse.results[`${column.folder}_${column.config}_${column.name}`];
        //For better or worse we imitate the original behaviour of passing on a lack of data
        if (data)
          ret[key] = {
            data: DataDecoders.Encoder.Create(data.encoder).decodeArray(data.data),
            summariser: data.summariser
          };
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
    query: SQL.nullQuery,
    order: null,
    groupby: null,
    ascending: true,
    count: false,
    start: 0,
    stop: 1000000,
    distinct: false,
    transpose: true
  };
  let {database, table, columns, query, order, groupby,
    ascending, count, start, stop, distinct, transpose} = {...defaults, ...options};

  let collist = '';
  _forEach(columns, (encoding, id) => {
    if (collist.length > 0) collist += '~';
    collist += encoding + id;
  });
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  let params = {};
  params = order ? {order, ...params} : params;
  params = groupby ? {groupby: groupby.join('~'), ...params} : params;
  return requestJSON({
    ...args,
    params: {
      ...params,
      datatype: 'pageqry',
      database,
      tbname: table,
      qry: encodeQuery(query),
      collist: LZString.compressToEncodedURIComponent(collist),
      sortreverse: ascending ? '0' : '1',
      needtotalcount: count ? '1' : '0',
      limit: `${start}~${stop}`,
      distinct: distinct ? '1' : '0'
    }
  })
    .then(_decodeValList(columns))
    //Transpose into rows if needed
    .then((columns) => {
      if (transpose) {
        let rows = [];
        for (let i = 0; i < columns[_keys(columns)[0]].length; i++) {
          let row = {};
          _forEach(columns, (array, id) => row[id] = array[i]);
          rows.push(row);
        }
        return rows;
      } else {
        return columns;
      }
    });
}

function annotationData(options) {
  //TODO Extra field when needed by region channel?
  assertRequired(options, [
    'database', 'chrom', 'start', 'end']);
  options.stop = options.end; //Rename to harmonise with rest of code
  //These are the defaannults of the GFF parser on import
  let defaults = {
    datatype: 'annot',
    table: 'annotation',
    field_start: 'fstart',           //eslint-disable-line camelcase
    field_stop: 'fstop',             //eslint-disable-line camelcase
    field_name: 'fname',             //eslint-disable-line camelcase
    field_id: 'fid',                 //eslint-disable-line camelcase
    field_chrom: 'chromid',          //eslint-disable-line camelcase
    ftype: 'gene',
    fsubtype: 'CDS',
    subfeatures: '1'
  };
  let params = Object.assign(defaults, options);
  delete params.cancellation;
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    params: params
  })
    .then((data) => {
      let valListDecoder = DataDecoders.ValueListDecoder();
      ['IDs', 'Names', 'ParentIDs', 'Sizes', 'Starts', 'Types'].forEach((key) =>
        data[key] = valListDecoder.doDecode(data[key])
      );
      //Remap to sensible names
      data = {
        ids: data.IDs,
        names: data.Names,
        parents: data.ParentIDs,
        sizes: data.Sizes,
        starts: data.Starts,
        types: data.Types
      };
      return data;
    });
}

function summaryData(options) {
  assertRequired(options, ['chromosome', 'columns', 'blocksize', 'blockstart', 'blockcount']);
  let defaults = {};
  let {chromosome, columns, blocksize, blockstart, blockcount} = Object.assign(defaults, options);

  let collist = '';
  _forEach(columns, (column) => {
    if (collist.length > 0) collist += '~';
    collist += `${column.folder}~${column.config}~${column.name}`;
  });
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
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

function treeData(options) {
  assertRequired(options, ['database', 'table', 'tree']);
  let {database, table, tree} = options;
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    params: {
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: 'getgraph',
      database: database,
      tableid: table,
      graphid: tree
    }
  }).then((response) => response);
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
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  let query = SQL.WhereClause.encode(SQL.WhereClause.CompareFixed(primKeyField, '=', primKeyValue));
  return requestJSON({
    ...args,
    params: {
      datatype: 'recordinfo',
      database: database,
      tbname: table,
      qry: encodeQuery(query)
    }
  }).then((response) => response.Data);
}

function findGene(options) {
  assertRequired(options, ['database', 'search', 'maxMatches']);
  let {database, search, maxMatches} = options;
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    params: {
      datatype: 'findgene',
      database: database,
      table: 'annotation',
      pattern: search,
      count: maxMatches,
      reportall: 1
    }
  })
    .then((data) => {
      let valListDecoder = DataDecoders.ValueListDecoder();
      ['Chroms', 'Descrs', 'Ends', 'Hits', 'IDs', 'Starts'].forEach((key) =>
        data[key] = valListDecoder.doDecode(data[key])
      );
      // Remap data to lowercase keys
      data = {
        chromosomes: data.Chroms,
        descriptions: data.Descrs,
        ends: data.Ends,
        hits: data.Hits,
        ids: data.IDs,
        starts: data.Starts
      };
      return data;
    });
}

function findGenesInRegion(options) {

  assertRequired(options, ['database', 'chromosome', 'startPosition', 'endPosition']);
  let {database, chromosome, startPosition, endPosition} = options;

  let columns = {'fid': 'ST', 'fname': 'ST', 'descr': 'ST', 'fstart': 'IN', 'fstop': 'IN'};

  // Construct query for chromosome, start and end positions.
  let query = SQL.WhereClause.encode(SQL.WhereClause.AND([
    SQL.WhereClause.CompareFixed('chromid', '=', chromosome),
    SQL.WhereClause.CompareFixed('fstop', '>=', startPosition),
    SQL.WhereClause.CompareFixed('fstart', '<=', endPosition),
    SQL.WhereClause.CompareFixed('ftype', '=', 'gene')
  ]));

  return pageQuery(
    {
      database: database,
      table: 'annotation',
      columns: columns,
      query: query
    }
  );
}

function fetchGene(options) {
  assertRequired(options, ['database', 'geneId']);
  let {database, geneId} = options;
  return fetchSingleRecord(
    {
      database: database,
      table: 'annotation',
      primKeyField: 'fid',
      primKeyValue: geneId
    }
  );
}

function fetchImportStatusData(options) {
  assertRequired(options, ['dataset']);
  // let {dataset} = options;
  let columns = {'id': 'GN',
                 'user': 'GN',
                 'timestamp': 'GN',
                 'name': 'GN',
                 'status': 'GN',
                 'progress': 'IN',
                 'completed': 'IN',
                 'failed': 'IN',
                 'scope': 'GN'
  };
  // TODO: only get logs for this dataset
  //SQL.WhereClause.encode(SQL.WhereClause.CompareFixed("dataset", '=', dataset))

  let query = SQL.nullQuery;
  return pageQuery(
    {
      database: '', // Falls back to default DB in DQXServer config
      table: 'calculations',
      columns: columns,
      query: query,
      order: 'timestamp',
      ascending: false
    }
  );
}


function fetchImportStatusLog(options) {
  assertRequired(options, ['logId']);
  let {logId} = options;
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    params: {
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: 'getcalculationlog',
      id: logId
    }
  })
    .then((data) => data.Content);
}

function importDataset(dataset) {
  return requestJSON({

    params: {
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: 'fileload_dataset',
      ScopeStr: 'all',
      SkipTableTracks: 'false',
      datasetid: dataset
    }

  }).then((resp) => JSON.parse(Base64.decode(resp.content)));
}


function importDatasetConfig(dataset) {
  return requestJSON({

    params: {
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: 'fileload_dataset',
      ScopeStr: 'none',
      SkipTableTracks: 'false',
      datasetid: dataset
    }

  }).then((resp) => JSON.parse(Base64.decode(resp.content)));
}


function truncatedRowsCount(options) {
  assertRequired(options, ['database', 'table']);

  // NB: If no maxRowsCount (maxRecordCount) is specified, then DQXServer's getrecordcount.py defaults to 10000
  let defaults = {
    query: SQL.nullQuery,
    maxRowsCount: 10000
  };

  let {database, table, query, maxRowsCount} = {...defaults, ...options};

  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    params: {
      datatype: 'getrecordcount',
      database: database,
      tbname: table,
      qry: encodeQuery(query),
      maxrecordcount: maxRowsCount
    }
  }).then((response) => response.TotalRecordCount);
}

function modifyConfig(options) {
  assertRequired(options, ['dataset', 'path', 'action', 'content']);
  let {dataset, path, action, content} = options;
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    method: 'POST',
    data: JSON.stringify(content),
    params: {
      dataset,
      path,
      action,
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: 'modifyconfig'
    }
  }).then((response) => response.config);
}



function twoDPageQuery(options) {
  assertRequired(options, ['database', 'datatable']);
  let defaults = {
    col_qry: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
    row_qry: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
    col_order: 'NULL',
    row_order: 'NULL',
    col_properties: '',
    row_properties: '',
    '2D_properties': '',
    sort_mode: null,
    row_sort_property: null,
    row_sort_cols: '',
    col_key: null,
    row_offset: null,
    row_limit: null,
    col_fail_limit: null,
  };
  const {
    database, datatable, col_qry, row_qry, col_order, row_order, col_properties,
    row_properties, sort_mode, row_sort_property, row_sort_cols, col_key,
    row_offset, row_limit, col_fail_limit
  } = {...defaults, ...options};
  const twoD_properties = {...defaults, ...options}['2D_properties'];
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestArrayBuffer({
    ...args,
    params: {
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: '2d_query',
      dataset: database,
      datatable,
      col_qry: encodeQuery(col_qry),
      row_qry: encodeQuery(row_qry),
      col_order,
      row_order,
      col_properties,
      row_properties,
      '2D_properties': twoD_properties,
      sort_mode,
      row_sort_property,
      row_sort_cols,
      col_key,
      row_offset,
      row_limit,
      col_fail_limit,
    }
  });
}

// TODO: Maintain an order to this list?
module.exports = {
  serverURL: initialConfig.serverURL, //eslint-disable-line no-undef
  filterAborted,
  errorMessage,
  requestJSON,
  pageQuery,
  storeData,
  fetchData,
  summaryData,
  annotationData,
  fetchSingleRecord,
  treeData,
  findGene,
  findGenesInRegion,
  fetchGene,
  fetchImportStatusData,
  fetchImportStatusLog,
  importDataset,
  importDatasetConfig,
  truncatedRowsCount,
  modifyConfig,
  twoDPageQuery
};
