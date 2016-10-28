import Immutable from 'immutable';
import LZString from 'lz-string';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';

const MAX_DOWNLOAD_DATA_POINTS = 100000;

// TODO: migrate to API.js ???
function downloadTableData(payload) {

  let defaults = {
    query: SQL.nullQuery
  };

  let {dataset, table, query, columns, tableConfig, rowsCount, onLimitBreach, order} = {...defaults, ...payload};

  // If no columns have been specified, get all of the showable columns.
  if (!columns)
    columns = Immutable.List(tableConfig.properties)
      .filter((prop) => prop.showByDefault && prop.showInTable)
      .map((prop) => prop.id);

  // Calculate the number of data points in the requested download (rows x cols).
  let totalDataPoints = rowsCount * columns.size;
  if (totalDataPoints > MAX_DOWNLOAD_DATA_POINTS) {
    onLimitBreach({totalDataPoints, maxDataPoints: MAX_DOWNLOAD_DATA_POINTS});
    return null;
  }

  // Get the list of columns being shown.
  let columnList = '';
  columns.map((column) => {
    if (column === 'StoredSelection') return;
    let encoding = tableConfig.propertiesById[column].defaultFetchEncoding;
    if (columnList.length !== 0) columnList += '~';
    columnList += encoding + column;
  });

  if (!columnList) {
    console.error('!columnList');
    return null;
  }

  let downloadURL = API.serverURL;
  downloadURL += '?datatype=downloadtable';
  downloadURL += '&database=' + dataset;
  downloadURL += '&query=' + API.encodeQuery(query);
  downloadURL += '&table=' + table;
  downloadURL += '&columns=' + LZString.compressToEncodedURIComponent(columnList);

  if (order instanceof Array && order.length > 0) {
    downloadURL += '&orderBy=' + JSON.stringify(order);
  }

  window.location.href = downloadURL;
}


function downloadGenotypeData(payload) {

  let data = '';
  data += '#Dataset: ' + payload.dataset + '\r\n';
  // NB: tableCapNamePlural (Cap) is not available
  data += '#Table: ' + payload.tableNamePlural + (payload.cellColour == 'call' ? ' Calls' : ' Allele Depths') + '\r\n';
  data += '#' + payload.colTableCapNamePlural + ' query: ' + payload.columnQueryAsString + '\r\n';
  data += '#' + payload.rowTableCapNamePlural + ' query: ' + payload.rowQueryAsString + '\r\n';
  data += '#Choromosome: ' + payload.chromosome + '\r\n';
  data += '#Start: ' + Math.floor(payload.start) + '\r\n';
  data += '#End: ' + Math.ceil(payload.end) + '\r\n';
  data += '#URL: ' + window.location.href + '\r\n';

  // TODO: determine totalDataPoints
  let totalDataPoints = MAX_DOWNLOAD_DATA_POINTS;
  if (totalDataPoints > MAX_DOWNLOAD_DATA_POINTS) {
    payload.onLimitBreach({totalDataPoints, maxDataPoints: MAX_DOWNLOAD_DATA_POINTS});
    return null;
  }

  // Magic, credit http://jsfiddle.net/user/koldev/
  let tmp = document.createElement('a');
  document.body.appendChild(tmp);
  tmp.style = 'display: none';
  let blob = new Blob([data], {type: 'text/plain'});
  let url = window.URL.createObjectURL(blob);
  tmp.href = url;
  tmp.download = payload.tableNamePlural + '_'
    + (payload.cellColour == 'call' ? 'Calls_' : 'Allele_Depths_')
    + payload.chromosome + '_'
    + Math.floor(payload.start) + '-' + Math.ceil(payload.end) + '.txt'
  ;
  tmp.click();
  window.URL.revokeObjectURL(url);

}

module.exports = {
  downloadTableData,
  downloadGenotypeData
};
