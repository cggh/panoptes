const keyMirror = require('react/lib/keyMirror');
const _ = require('lodash');

function nameSpace(namespace, obj) {
  let res = {};
  _.forOwn(obj, (key, val) => res[key] = namespace+'_'+val);
  return res;
}

let layout = keyMirror({
  COMPONENT_UPDATE: null,
  MODAL_CLOSE: null,
  MODAL_OPEN: null,
  NOTIFY: null,
  POPUP_CLOSE: null,
  POPUP_MOVE: null,
  POPUP_RESIZE: null,
  TAB_CLOSE: null,
  TAB_SWITCH: null
});

let panoptes = keyMirror({
});

let api = keyMirror({
  FETCH_USER: null,
  FETCH_USER_FAIL: null,
  FETCH_USER_SUCCESS: null
});


module.exports = {
  LAYOUT: nameSpace('LAYOUT', layout),
  PANOPTES: nameSpace('PANOPTES', panoptes),
  API: nameSpace('API', api)
};
