import qajax from 'qajax';
import arrayBufferDecode from 'panoptes/arrayBufferDecode';
import _keys from 'lodash.keys';
import _forEach from 'lodash.foreach';
import _isNumber from 'lodash.isnumber';
import assertRequired from 'util/Assert';
import SQL from 'panoptes/SQL';
import DataDecoders from 'panoptes/DataDecoders';
import Base64 from 'panoptes/Base64';
import _assign from 'lodash.assign';

const serverURL = process.env.DATASET_URL_PATH_PREFIX + '/panoptes/api';

//TODO: Refactor server errors to closer to HTTP standard
function _filterError(json) {
  if (typeof (json) !== 'object') {
    if (json.indexOf('Authentication') > 0)
      throw Error('Client is not authenticated');
    throw Error('Invalid server response type');
  }
  if ('Error' in json) {
    throw Error(`Error: ${json.Error}`);
  }
  if ('issue' in json) {
    throw Error(json.issue);
  }
  return json;
}

function filterAborted(xhr) {
  if (xhr == '__CANCELLED__' || (xhr.status === 0 && xhr.readyState == 0))  //This seems to be the only way to detect the cancel
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
    url: serverURL,
    method,
    params: {},
    timeout: 60000,
    data
  };
  //Remove null params
  for (let key in options.params) {
    if (options.params[key] === null) {
      delete options.params[key];
    }
  }
  //Annoyingly qajax doesn't check for cancellation before it fires off the request
  if (options.cancellation && options.cancellation.isFulfilled()) {
    return Promise.reject('__CANCELLED__');
  }
  //We could use the shiny new Fetch API here - but as there is no "abort" for that currently we stick with qajax.
  return qajax(_assign(defaults, options))
    .then(qajax.filterSuccess);
}

function requestJSON(options, method = 'GET', data = null) {
  return request(options, method, data)
    .then(qajax.toJSON)
    .then(_filterError);
}

function requestArrayBuffer(options, method = 'GET', data = null) {
  options.responseType = 'arraybuffer';
  return request(options, method, data)
    .then(({response}) => arrayBufferDecode(response));
}

function _decodeValList(columns) {
  return function(jsonResponse) {
    let vallistdecoder = DataDecoders.ValueListDecoder();
    let ret = {};
    _forEach(columns, (encoding, id) =>
      ret[id] = vallistdecoder.doDecode(jsonResponse[id])
    );
    return ret;
  };
}

function _decodeSummaryList(columns) {
  return function(jsonResponse) {
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

function treeData(options) {
  assertRequired(options, ['database', 'table', 'tree']);
  let {database, table, tree} = options;
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    params: {
      datatype: 'getgraph',
      database,
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
    data
  }).then((resp) => resp.id);
}

function fetchData(id) {
  return requestJSON({
    params: {datatype: 'fetchstoredata', id}
  }).then((resp) => JSON.parse(Base64.decode(resp.content)));
}

function fetchSingleRecord(options) {
  assertRequired(options, ['database', 'table', 'columns', 'primKey', 'primKeyValue']);
  let {database, table, columns, primKey, primKeyValue, cancellation} = options;
  let recordQuery = SQL.WhereClause.encode(SQL.WhereClause.CompareFixed(primKey, '=', primKeyValue));
  return query({
    cancellation,
    database,
    table,
    columns,
    query: recordQuery,
    transpose: true //We want rows, not columns
  }).then((data) => {
    if (data.length === 0) {
      throw Error(`Tried to get non-existent record ${primKeyValue}`);
    }
    return data[0];
  });
}

function findGene(options) {
  assertRequired(options, ['database', 'search', 'maxMatches']);
  let {database, search, maxMatches} = options;
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    params: {
      datatype: 'findgene',
      database,
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

  let columns = ['fid', 'fname', 'descr', 'fstart', 'fstop'];

  // Construct query for chromosome, start and end positions.
  let recordQuery = SQL.WhereClause.encode(SQL.WhereClause.AND([
    SQL.WhereClause.CompareFixed('chromid', '=', chromosome),
    SQL.WhereClause.CompareFixed('fstop', '>=', startPosition),
    SQL.WhereClause.CompareFixed('fstart', '<=', endPosition),
    SQL.WhereClause.CompareFixed('ftype', '=', 'gene')
  ]));

  return query(
    {
      database,
      table: 'annotation',
      columns,
      query: recordQuery,
      transpose: true
    }
  );
}

function fetchGene(options) {
  assertRequired(options, ['database', 'geneId']);
  let {database, geneId} = options;
  let recordQuery = SQL.WhereClause.encode(SQL.WhereClause.CompareFixed('fid', '=', geneId));
  return query({
    database,
    table: 'annotation',
    columns: ['fid', 'chromid', 'fname', 'fnames', 'descr', 'fstart', 'fstop', 'fparentid', 'ftype'],
    query: recordQuery,
    transpose: true //We want rows, not columns
  }).then((data) => {
    if (data.length === 0) {
      throw Error(`Tried to get non-existent record ${geneId}`);
    }
    return data[0];
  });
}

function fetchImportStatusData(options) {
  assertRequired(options, ['dataset']);
  // let {dataset} = options;
  let columns = [
    'id',
    'user',
    'timestamp',
    'name',
    'status',
    'progress',
    'completed',
    'failed',
    'scope'
  ];
  // TODO: only get logs for this dataset
  //SQL.WhereClause.encode(SQL.WhereClause.CompareFixed("dataset", '=', dataset))
  let recordQuery = SQL.nullQuery;
  return query(
    {
      database: 'datasets',
      table: 'calculations',
      columns,
      query: recordQuery,
      orderBy: [['desc', 'timestamp']],
      transpose: true,
      cache: false
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
      datatype: 'getcalculationlog',
      id: logId
    }
  })
    .then((data) => data.Content);
}

function importDataset(dataset) {
  return requestJSON({

    params: {
      datatype: 'fileload_dataset',
      ScopeStr: 'all',
      SkipTableTracks: 'false',
      datasetid: dataset
    }

  }).then((resp) => JSON.parse(Base64.decode(resp.content)));
}

function rowsCount(options) {
  options.transpose = true;
  options.columns = [{expr: JSON.parse(JSON.stringify(['count', ['*']])), as: 'TotalRecordCount'}];
  options.groupBy = [];
  options.orderBy = [];
  options.start = undefined;
  options.stop = undefined;
  return query(options).then((response) => response[0].TotalRecordCount);
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
      datatype: 'modifyconfig'
    }
  }).then((response) => response.config);
}

function replaceYAMLConfig(options) {
  assertRequired(options, ['dataset', 'path', 'content']);
  let {dataset, path, content} = options;
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    method: 'POST',
    data: content,
    params: {
      dataset,
      path,
      datatype: 'replaceconfig'
    }
  }).then((response) => response.config);
}


function twoDPageQuery(options) {
  assertRequired(options, ['dataset', 'table']);
  let defaults = {
    colQry: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
    rowQry: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
    colOrder: null,
    rowOrder: null,
    colProperties: '',
    rowProperties: '',
    '2DProperties': '',
    sortMode: null,
    rowSortProperty: null,
    rowSortCols: '',
    colKey: null,
    rowOffset: null,
    rowLimit: null,
    colFailLimit: null,
    rowRandomSample: null
  };
  const {
    dataset, table, colQry, rowQry, colOrder, rowOrder, colProperties,
    rowProperties, sortMode, rowSortProperty, rowSortCols, colKey,
    rowOffset, rowLimit, colFailLimit, rowRandomSample
  } = {...defaults, ...options};
  const twoDProperties = {...defaults, ...options}['2DProperties'];
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestArrayBuffer({
    ...args,
    params: {
      datatype: '2d_query',
      dataset,
      table,
      colQry: encodeQuery(colQry),
      rowQry: encodeQuery(rowQry),
      colOrder,
      rowOrder,
      colProperties,
      rowProperties,
      '2DProperties': twoDProperties,
      sortMode,
      rowSortProperty,
      rowSortCols,
      colKey,
      rowOffset,
      rowLimit,
      colFailLimit,
      rowRandomSample
    }
  });
}

function query(options) {
  assertRequired(options, ['database', 'table', 'columns']);
  let defaults = {
    query: SQL.nullQuery,
    orderBy: [],
    groupBy: [],
    start: undefined,
    stop: undefined,
    distinct: false,
    transpose: false,
    typedArrays: false,
    randomSample: undefined,
    cache: true,
    joins: []
  };
  let {database, table, columns, query, orderBy, groupBy,
    start, stop, distinct, transpose, randomSample, cache, typedArrays, joins} = {...defaults, ...options};

  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestArrayBuffer({
    ...args,
    params: {
      datatype: 'query'
    }
  }, 'POST',
  JSON.stringify({
    database,
    table,
    query,
    columns: JSON.stringify(columns),
    limit: (_isNumber(start) && _isNumber(stop)) ? `${start}~${stop}` : undefined,
    distinct: distinct ? 'true' : 'false',
    orderBy: JSON.stringify(orderBy),
    groupBy: Array.isArray(groupBy) ? groupBy.join('~') : undefined,
    randomSample,
    cache,
    joins: JSON.stringify(joins)
  }))
    .then((columns) => {
      if (!typedArrays) {
      //Convert to regular arrays and convert nulls
        let plainArrays = {};
        _forEach(columns, (array, name) => plainArrays[name] = Array.prototype.slice.call(array.array));
        _forEach(plainArrays, (array, name) => {
          let nullValue = nullValues[columns[name].type];
          if (nullValue !== undefined) {
            for (let i = 0, len = array.length; i < len; ++i) {
              if (array[i] === nullValue) {
                array[i] =  null;
              }
            }
          }
        });
        return plainArrays;
      } else {
        return columns;
      }
    })
    .then((columns) => {
    // Transpose into rows if needed
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

function staticContent(options) {
  assertRequired(options, ['url']);
  return request(options).then((resp) => resp.responseText);
}

function fetchFeedData(options) {
  assertRequired(options, ['url']);
  const {url, cancellation} = options;
  const args = cancellation ? {cancellation} : {};
  return requestJSON({
    ...args,
    params: {
      datatype: 'getfeed',
      url,
      cache: true,
    }
  })
    .then((resp) => JSON.parse(Base64.decode(resp.content)));
}

//Null values from monet - https://www.monetdb.org/Documentation/Manuals/SQLreference/BuiltinTypes
//Monet will not let these values be imported so it is safe to do.
const nullValues = {
  i1: -128,
  i2: -32768,
  i4: -2147483648,
  Int8: -128,
  Int16: -32768,
  Int32: -2147483648,
};

export default {
  encodeQuery,
  errorMessage,
  fetchData,
  fetchFeedData,
  fetchGene,
  fetchImportStatusData,
  fetchImportStatusLog,
  fetchSingleRecord,
  filterAborted,
  findGene,
  findGenesInRegion,
  importDataset,
  modifyConfig,
  replaceYAMLConfig,
  nullValues,
  query,
  requestJSON,
  rowsCount,
  serverURL,
  storeData,
  treeData,
  twoDPageQuery,
  staticContent
};
