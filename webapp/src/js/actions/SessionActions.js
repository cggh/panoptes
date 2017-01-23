import React from  'react';
import Constants from '../constants/Constants';
const SESSION = Constants.SESSION;

import serialiseComponent from 'util/serialiseComponent';
import EmptyTab from 'containers/EmptyTab';


let SessionActions = {
  componentSetProps(componentPath, updater, throttleStoreState) {
    this.dispatch(SESSION.COMPONENT_SET_PROPS, {
      componentPath,
      updater,
      throttleStoreState
    });
  },
  componentReplace(componentPath, newComponent) {
    this.dispatch(SESSION.COMPONENT_REPLACE, {
      componentPath,
      newComponent: serialiseComponent(newComponent)
    });
  },
  modalClose() {
    this.dispatch(SESSION.MODAL_CLOSE);
  },
  modalOpen(newComponent) {
    this.dispatch(SESSION.MODAL_OPEN, newComponent);
  },
  modalSetProps(ignored, updater) {
    this.dispatch(SESSION.MODAL_SET_PROPS, {
      updater
    });
  },
  notify(notification) {
    this.dispatch(SESSION.NOTIFY, notification);
  },
  popupClose(compId) {
    this.dispatch(SESSION.POPUP_CLOSE, {compId});
  },
  popupOpen(component, switchTo = true) {
    if (!component) {
      component = <EmptyTab />;
    }
    this.dispatch(SESSION.TAB_OPEN, {
      component: serialiseComponent(component),
      switchTo
    });
    // this.dispatch(SESSION.POPUP_OPEN, {
    //   component: serialiseComponent(component),
    //   switchTo
    // });
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
  tabOpen(component, switchTo = true) {
    if (!component) {
      component = <EmptyTab />;
    }
    this.dispatch(SESSION.TAB_OPEN, {
      component: serialiseComponent(component),
      switchTo
    });
  },
  tabPopOut(compId, pos) {
    this.dispatch(SESSION.TAB_POP_OUT, {compId, pos});
  },
  tabSwitch(compId) {
    this.dispatch(SESSION.TAB_SWITCH, {compId});
  },
  geneFound(geneId, geneDesc) {
    this.dispatch(SESSION.GENE_FOUND, {
      geneId,
      geneDesc
    });
  },
  tableQueryUsed(table, query) {
    this.dispatch(SESSION.TABLE_QUERY_USED, {
      table,
      query
    });
  },
  appResize() {
    this.dispatch(SESSION.APP_RESIZE, {});
  },

  reuseComponentOrPopup(componentName, props) {
    this.dispatch(SESSION.REUSE_OR_POPUP, {componentName, props});
  }
};

export default SessionActions;
