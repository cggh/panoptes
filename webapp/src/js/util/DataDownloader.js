import Immutable from 'immutable';
import LZString from 'lz-string';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';
import FileSaver from 'file-saver';

const MAX_DOWNLOAD_DATA_POINTS = 100000;

// TODO: migrate to API.js ???
export function downloadTableData(payload) {

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

export function downloadGenotypeData({
  dataset, tableNamePlural, cellColour,
  colTableCapNamePlural, rowTableCapNamePlural,
  columnQueryAsString, rowQueryAsString,
  chromosome, start, end,
  rowPrimaryKey, callData, alleleDepthData, positions
  }) {
  let data = '';
  data += '#Dataset: ' + dataset + '\r\n';
  // NB: tableCapNamePlural (Cap) is not available
  data += '#Table: ' + tableNamePlural + (cellColour == 'call' ? ' Calls' : ' Allele Depths') + '\r\n';
  data += '#' + colTableCapNamePlural + ' filter: ' + columnQueryAsString + '\r\n';
  data += '#' + rowTableCapNamePlural + ' filter: ' + rowQueryAsString + '\r\n';
  data += '#Choromosome: ' + chromosome + '\r\n';
  data += '#Start: ' + Math.floor(start) + '\r\n';
  data += '#End: ' + Math.ceil(end) + '\r\n';
  data += '#URL: ' + window.location.href + '\r\n';
  data += 'Position\t';
  for (var i = 0; i < rowPrimaryKey.length; i++)
    data += rowPrimaryKey[i] + '\t'
  data += "\r\n";
  var propArray = cellColour == 'call' ? callData : alleleDepthData;
  var arity = propArray.shape[2] || 1;
  for (i = 0; i < positions.length; i++) {
    data += positions[i] + '\t';
    for (var j = 0; j < rowPrimaryKey.length; j++) {
      for (var k = 0; k < arity; k++) {
        data += propArray[j][i * arity + k];
        if (k < arity - 1)
          data += ','
      }
      data += '\t';
    }
    data += '\r\n';
  }
  let blob = new Blob([data], {type: 'text/plain'});
  FileSaver.saveAs(blob,
    payload.dataset + '-' +
    (payload.cellColour == 'call' ? 'Calls' : ' Allele Depths') + '-' +
    payload.tableNamePlural + '-' +
    payload.chromosome + '_' +
    Math.floor(payload.start) + '-' + Math.ceil(payload.end) + '.txt');
}
