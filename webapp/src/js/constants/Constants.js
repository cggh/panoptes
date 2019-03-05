import keyMirror from 'keymirror';
import _forOwn from 'lodash.forown';

function nameSpace(namespace, obj) {
  let res = {};
  _forOwn(obj, (key, val) => res[key] = `${namespace}_${val}`);
  return res;
}

let session = keyMirror({
  COMPONENT_SET_PROPS: null,
  COMPONENT_REPLACE: null,
  MODAL_CLOSE: null,
  MODAL_OPEN: null,
  MODAL_SET_PROPS: null,
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
  TABLE_QUERY_USED: null,
  APP_RESIZE: null,
  REUSE_OR_POPUP: null
});

let panoptes = keyMirror({
});

let api = keyMirror({
  FETCH_USER: null,
  FETCH_USER_FAIL: null,
  FETCH_USER_SUCCESS: null,
  MODIFY_CONFIG: null,
  MODIFY_CONFIG_SUCCESS: null,
  MODIFY_CONFIG_FAIL: null,
  UPDATE_URL: null
});


export default {
  SESSION: nameSpace('SESSION', session),
  PANOPTES: nameSpace('PANOPTES', panoptes),
  API: nameSpace('API', api)
};
