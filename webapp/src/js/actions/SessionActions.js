import Constants from '../constants/Constants';
const SESSION = Constants.SESSION;
import memoize from 'utils/Memoize';


let SessionActions = {
  componentUpdate(compId, updater, newComponent = null) {
    this.dispatch(SESSION.COMPONENT_UPDATE, {
      compId,
      updater,
      newComponent
    });
  },
  //We cache these, other wise the prop looks different causing a re-render
  //TODO Strictly speaking this is memory leak, albeit a small one
  componentUpdateFor: memoize((compId) =>
    function(updater, newComponent = null) {
      this.dispatch(SESSION.COMPONENT_UPDATE, {
        compId,
        updater,
        newComponent
      });
    }
  ),
  modalClose() {
    this.dispatch(SESSION.MODAL_CLOSE);
  },
  modalOpen(component, props) {
    this.dispatch(SESSION.MODAL_OPEN, {component, props});
  },
  notify(notification) {
    this.dispatch(SESSION.NOTIFY, notification);
  },
  popupClose(compId) {
    this.dispatch(SESSION.POPUP_CLOSE, {compId});
  },
  popupOpen(component = null, props = {}) {
    this.dispatch(SESSION.POPUP_OPEN, {
      component: {component, props}
    });
  },
  popupFocus(compId) {
    this.dispatch(SESSION.POPUP_FOCUS, {compId});
  },
  popupMove(compId, pos) {
    this.dispatch(SESSION.POPUP_MOVE, {compId, pos});
  },
  popupResize(compId, size) {
    this.dispatch(SESSION.POPUP_RESIZE, {compId, size});
  },
  popupToTab(compId) {
    this.dispatch(SESSION.POPUP_TO_TAB, {compId});
  },
  tabClose(compId) {
    this.dispatch(SESSION.TAB_CLOSE, {compId});
  },
  tabOpen(component = null, props = {}, switchTo = true) {
    this.dispatch(SESSION.TAB_OPEN, {
      component: {component, props},
      switchTo
    });
  },
  tabPopOut(compId, pos) {
    this.dispatch(SESSION.TAB_POP_OUT, {compId, pos});
  },
  tabSwitch(compId) {
    this.dispatch(SESSION.TAB_SWITCH, {compId});
  },
  geneFound(geneId) {
    this.dispatch(SESSION.GENE_FOUND, {
      geneId: geneId
    });
  },
  tableQueryUsed(table, query) {
    this.dispatch(SESSION.TABLE_QUERY_USED, {
      table: table,
      query: query
    });
  }

};

module.exports = SessionActions;
