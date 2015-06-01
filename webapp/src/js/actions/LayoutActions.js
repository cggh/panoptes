const Constants = require('../constants/Constants');
const LAYOUT = Constants.LAYOUT;

let LayoutActions = {
  modalClose() {
    this.dispatch(LAYOUT.MODAL_CLOSE);
  },
  notify(notification) {
    this.dispatch(LAYOUT.NOTIFY, notification);
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
  tabSwitch(compId) {
    debugger;
    this.dispatch(LAYOUT.TAB_SWITCH, {
      compId: compId
    });
  }
};

module.exports = LayoutActions;
