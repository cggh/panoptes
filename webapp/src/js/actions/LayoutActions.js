const Constants = require('../constants/Constants');
const LAYOUT = Constants.LAYOUT;

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

let LayoutActions = {
  componentUpdate(compId, newProps, newComponent = null) {
    this.dispatch(LAYOUT.COMPONENT_UPDATE, {
      compId: compId,
      newProps: newProps,
      newComponent: newComponent
    });
  },
  componentUpdateFor: memoize((compId) => {
    return function (newProps, newComponent = null) {
      this.dispatch(LAYOUT.COMPONENT_UPDATE, {
        compId: compId,
        newProps: newProps,
        newComponent: newComponent
      });
    }
  }),
  modalClose() {
    this.dispatch(LAYOUT.MODAL_CLOSE);
  },
  modalOpen(component, props) {
    this.dispatch(LAYOUT.MODAL_OPEN,
      {
        component: component,
        props: props
      });
  },
  notify(notification) {
    this.dispatch(LAYOUT.NOTIFY, notification);
  },
  popupClose(compId) {
    this.dispatch(LAYOUT.POPUP_CLOSE, {
      compId: compId
    });
  },
  popupFocus(compId) {
    this.dispatch(LAYOUT.POPUP_FOCUS, {
      compId: compId
    });
  },
  popupMove(compId, pos) {
    this.dispatch(LAYOUT.POPUP_MOVE, {
      compId: compId,
      pos: pos
    });
  },
  popupResize(compId, size) {
    this.dispatch(LAYOUT.POPUP_RESIZE, {
      compId: compId,
      size: size
    });
  },
  tabClose(compId) {
    this.dispatch(LAYOUT.TAB_CLOSE, {
      compId: compId
    });
  },
  tabOpen(component = null, props = {}, switchTo = true) {
    this.dispatch(LAYOUT.TAB_OPEN, {
      component: {
        component: component,
        props: props
      },
      switchTo: switchTo
    });
  },
  tabPopOut(compId, pos) {
    this.dispatch(LAYOUT.TAB_POP_OUT, {
      compId: compId,
      pos: pos
    });
  },
  tabSwitch(compId) {
    this.dispatch(LAYOUT.TAB_SWITCH, {
      compId: compId
    });
  }
};

module.exports = LayoutActions;
