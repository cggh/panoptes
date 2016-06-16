import keyMirror from 'keymirror';
import _forOwn from 'lodash/forOwn';

function nameSpace(namespace, obj) {
  let res = {};
  _forOwn(obj, (key, val) => res[key] = namespace + '_' + val);
  return res;
}

let session = keyMirror({
  COMPONENT_UPDATE: null,
  MODAL_CLOSE: null,
  MODAL_OPEN: null,
  NOTIFY: null,
  POPUP_CLOSE: null,
  POPUP_MOVE: null,
  POPUP_OPEN: null,
  POPUP_FOCUS: null,
  POPUP_RESIZE: null,
  POPUP_TO_TAB: null,
  TAB_CLOSE: null,
  TAB_OPEN: null,
  TAB_POP_OUT: null,
  TAB_SWITCH: null,
  GENE_FOUND: null,
  TABLE_QUERY_USED: null
});

let panoptes = keyMirror({
});

let api = keyMirror({
  FETCH_USER: null,
  FETCH_USER_FAIL: null,
  FETCH_USER_SUCCESS: null,
  STORE_TABLE_QUERY: null,
  STORE_TABLE_QUERY_FAIL: null,
  STORE_TABLE_QUERY_SUCCESS: null,
  DELETE_STORED_TABLE_QUERY_FAIL: null,
  DELETE_STORED_TABLE_QUERY_SUCCESS: null,
  SET_DEFAULT_TABLE_QUERY_FAIL: null,
  SET_DEFAULT_TABLE_QUERY_SUCCESS: null
});


module.exports = {
  SESSION: nameSpace('SESSION', session),
  PANOPTES: nameSpace('PANOPTES', panoptes),
  API: nameSpace('API', api)
};
