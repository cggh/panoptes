import Immutable from 'immutable';
import LZString from 'lz-string';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';

const MAX_DOWNLOAD_DATA_POINTS = 1000000;

// TODO: migrate to API.js ???
export default function downloadTableData(payload) {

  let defaults = {
    query: SQL.nullQuery
  };

  let {dataset, table, query, columns, tableConfig, rowsCount, onLimitBreach, order} = {...defaults, ...payload};

  // If no columns have been specified, get all of the showable columns.
  if (!columns)
    columns = Immutable.List(tableConfig.visibleProperties)
      .filter((prop) => prop.showByDefault)
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
  downloadURL += `&database=${dataset}`;
  downloadURL += `&query=${API.encodeQuery(query)}`;
  downloadURL += `&table=${table}`;
  downloadURL += `&columns=${LZString.compressToEncodedURIComponent(columnList)}`;

  if (order instanceof Array && order.length > 0) {
    downloadURL += `&orderBy=${JSON.stringify(order)}`;
  }
  window.location.href = downloadURL;
}
