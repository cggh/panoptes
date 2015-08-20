const Constants = require('../constants/Constants');
const SESSION = Constants.SESSION;

function memoize(fn) {
  let cache = {};
  return function (arg) {
    if (cache[arg] !== undefined) {
      return cache[arg];
    }
    var result = fn(arg).bind(this);
    cache[arg] = result;
    return result;
  };
}

let SessionActions = {
  componentUpdate(compId, updater, newComponent = null) {
    this.dispatch(SESSION.COMPONENT_UPDATE, {
      compId: compId,
      updater: updater,
      newComponent: newComponent
    });
  },
  componentUpdateFor: memoize((compId) => {
    return function (updater, newComponent = null) {
      this.dispatch(SESSION.COMPONENT_UPDATE, {
        compId: compId,
        updater: updater,
        newComponent: newComponent
      });
    }
  }),
  modalClose() {
    this.dispatch(SESSION.MODAL_CLOSE);
  },
  modalOpen(component, props) {
    this.dispatch(SESSION.MODAL_OPEN,
      {
        component: component,
        props: props
      });
  },
  notify(notification) {
    this.dispatch(SESSION.NOTIFY, notification);
  },
  popupClose(compId) {
    this.dispatch(SESSION.POPUP_CLOSE, {
      compId: compId
    });
  },
  popupFocus(compId) {
    this.dispatch(SESSION.POPUP_FOCUS, {
      compId: compId
    });
  },
  popupMove(compId, pos) {
    this.dispatch(SESSION.POPUP_MOVE, {
      compId: compId,
      pos: pos
    });
  },
  popupResize(compId, size) {
    this.dispatch(SESSION.POPUP_RESIZE, {
      compId: compId,
      size: size
    });
  },
  tabClose(compId) {
    this.dispatch(SESSION.TAB_CLOSE, {
      compId: compId
    });
  },
  tabOpen(component = null, props = {}, switchTo = true) {
    this.dispatch(SESSION.TAB_OPEN, {
      component: {
        component: component,
        props: props
      },
      switchTo: switchTo
    });
  },
  tabPopOut(compId, pos) {
    this.dispatch(SESSION.TAB_POP_OUT, {
      compId: compId,
      pos: pos
    });
  },
  tabSwitch(compId) {
    this.dispatch(SESSION.TAB_SWITCH, {
      compId: compId
    });
  }
};

module.exports = SessionActions;
