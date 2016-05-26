import qajax from 'qajax';
import _keys from 'lodash/keys';
import LZString from 'lz-string';
import _forEach from 'lodash/forEach';
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
    } else {
      throw Error(`Error: ${json.Error}`);
    }
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

function pageQuery(options) {
  assertRequired(options, ['database', 'table', 'columns']);
  let defaults = {
    query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
    order: null,
    ascending: false,
    count: false,
    start: 0,
    stop: 1000000,
    distinct: false,
    transpose: true
  };
  let {database, table, columns, query, order,
    ascending, count, start, stop, distinct, transpose} = {...defaults, ...options};

  let collist = '';
  _forEach(columns, (encoding, id) => {
    if (collist.length > 0) collist += '~';
    collist += encoding + id;
  });
  let args = options.cancellation ? {cancellation: options.cancellation} : {};
  return requestJSON({
    ...args,
    params: {
      datatype: 'pageqry',
      database: database,
      tbname: table,
      qry: query,
      collist: LZString.compressToEncodedURIComponent(collist),
      order: order,
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
  return requestJSON({
    ...args,
    params: {
      datatype: 'recordinfo',
      database: database,
      tbname: table,
      qry: SQL.WhereClause.encode(SQL.WhereClause.CompareFixed(primKeyField, '=', primKeyValue))
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
  let {dataset} = options;
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
  let query = SQL.WhereClause.encode(SQL.WhereClause.Trivial());
  return pageQuery(
    {
      database: 'datasetindex',
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

module.exports = {
  serverURL,
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
  importDatasetConfig
};
