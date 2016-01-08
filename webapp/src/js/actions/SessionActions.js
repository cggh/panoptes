const Constants = require('../constants/Constants');
const SESSION = Constants.SESSION;
const memoize = require('utils/Memoize');


let SessionActions = {
  componentUpdate(compId, updater, newComponent = null) {
    this.dispatch(SESSION.COMPONENT_UPDATE, {
      compId: compId,
      updater: updater,
      newComponent: newComponent
    });
  },
  //We cache these, other wise the prop looks different causing a re-render
  //TODO Strictly speaking this is memory leak, albeit a small one
  componentUpdateFor: memoize((compId) => {
    return function(updater, newComponent = null) {
      this.dispatch(SESSION.COMPONENT_UPDATE, {
        compId: compId,
        updater: updater,
        newComponent: newComponent
      });
    };
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
  popupOpen(component = null, props = {}) {
    this.dispatch(SESSION.POPUP_OPEN, {
      component: {
        component: component,
        props: props
      },
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
