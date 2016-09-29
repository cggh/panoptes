import Immutable from 'immutable';
import LZString from 'lz-string';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';

const MAX_DOWNLOAD_DATA_POINTS = 100000;

// TODO: migrate to API.js ???
function downloadTableData(payload) {

  let defaults = {
    query: SQL.nullQuery,
    ascending: true
  };

  let {dataset, table, query, columns, tableConfig, ascending, rowsCount, onLimitBreach} = {...defaults, ...payload};

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
  downloadURL += '?datatype' + '=' + 'downloadtable';
  downloadURL += '&database' + '=' + dataset;
  downloadURL += '&qry' + '=' + API.encodeQuery(query);
  downloadURL += '&tbname' + '=' + table;
  downloadURL += '&collist' + '=' + LZString.compressToEncodedURIComponent(columnList);
  if (tableConfig.position) {
    downloadURL += '&posfield' + '=' + tableConfig.position;
    downloadURL += '&order' + '=' + tableConfig.position;
  } else {
    downloadURL += '&order' + '=' + tableConfig.primKey;
  }
  downloadURL += '&sortreverse' + '=' + (ascending ? '0' : '1');

  window.location.href = downloadURL;
}

module.exports = {
  downloadTableData
};
