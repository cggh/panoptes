const Constants = require('../constants/Constants');
const LAYOUT = Constants.LAYOUT;

let LayoutActions = {
  componentUpdate(compId, newProps) {
    this.dispatch(LAYOUT.COMPONENT_UPDATE, {
      compId: compId,
      newProps: newProps
    });
  },
  modalClose() {
    this.dispatch(LAYOUT.MODAL_CLOSE);
  },
  notify(notification) {
    this.dispatch(LAYOUT.NOTIFY, notification);
  },
  popupClose(compId) {
    this.dispatch(LAYOUT.POPUP_CLOSE, {
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
  tabSwitch(compId) {
    this.dispatch(LAYOUT.TAB_SWITCH, {
      compId: compId
    });
  },
};

module.exports = LayoutActions;
