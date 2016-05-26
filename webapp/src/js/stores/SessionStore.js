import Fluxxor from 'fluxxor';
import Immutable from 'immutable';
import uid from 'uid';
import Constants from '../constants/Constants';
const SESSION = Constants.SESSION;
import _isFunction from 'lodash/isFunction';

const EMPTY_TAB = 'containers/EmptyTab';
const START_TAB = 'containers/StartTab';

let SessionStore = Fluxxor.createStore({

  initialize(state) {
    this.state = Immutable.fromJS(state);

    this.bindActions(
      SESSION.COMPONENT_UPDATE, this.emitIfNeeded(this.componentUpdate),
      SESSION.MODAL_CLOSE, this.emitIfNeeded(this.modalClose),
      SESSION.MODAL_OPEN, this.emitIfNeeded(this.modalOpen),
      SESSION.NOTIFY, this.emitIfNeeded(this.notify, 'notify'),
      SESSION.POPUP_CLOSE, this.emitIfNeeded(this.popupClose),
      SESSION.POPUP_FOCUS, this.emitIfNeeded(this.popupFocus),
      SESSION.POPUP_MOVE, this.emitIfNeeded(this.popupMove),
      SESSION.POPUP_OPEN, this.emitIfNeeded(this.popupOpen),
      SESSION.POPUP_RESIZE, this.emitIfNeeded(this.popupResize),
      SESSION.POPUP_TO_TAB, this.emitIfNeeded(this.popupToTab),
      SESSION.TAB_CLOSE, this.emitIfNeeded(this.tabClose),
      SESSION.TAB_OPEN, this.emitIfNeeded(this.tabOpen),
      SESSION.TAB_POP_OUT, this.emitIfNeeded(this.tabPopOut),
      SESSION.TAB_SWITCH, this.emitIfNeeded(this.tabSwitch),
      SESSION.GENE_FOUND, this.emitIfNeeded(this.geneFound),
      SESSION.TABLE_QUERY_USED, this.emitIfNeeded(this.tableQueryUsed),
      SESSION.TABLE_QUERY_STORE, this.emitIfNeeded(this.tableQueryStore) // TODO: transfer this to persistent storage.
    );
  },

  emitIfNeeded(action, event = 'change') {
    return (payload) => {
      let oldState = this.state;
      action(payload);
      if (!oldState.equals(this.state) || event === 'notify')
        this.emit(event);
    };
  },

  componentUpdate(payload) {
    let {compId, updater, newComponent} = payload;
    if (newComponent) {
      if (_isFunction(updater)) {
        this.state = this.state.setIn(['components', compId], Immutable.fromJS({component: newComponent, props: {}}));
        this.state = this.state.updateIn(['components', compId, 'props'], updater);
      } else {
        let component = Immutable.fromJS({
          component: newComponent,
          props: updater
        });
        this.state = this.state.setIn(['components', compId], component);
      }
    } else {
      if (_isFunction(updater)) {
        this.state = this.state.updateIn(['components', compId, 'props'], updater);
      } else {
        this.state = this.state.mergeDeepIn(['components', compId, 'props'], updater);
      }
    }
  },
  modalClose() {
    this.state = this.state.set('modal', Immutable.Map());
  },

  modalOpen(payload) {
    this.state = this.state.set('modal', Immutable.fromJS(payload));
  },

  notify(payload) {
    this.lastNotification = payload;
  },

  popupClose(payload) {
    let {compId} = payload;
    let list = this.state.getIn(['popups', 'components']).filter((popupId) => popupId !== compId);
    this.state = this.state.setIn(['popups', 'components'], list);
  },

  popupFocus(payload) {
    let {compId} = payload;
    this.state = this.state.updateIn(['popups', 'components'],
      (list) => list.filter((popupId) => popupId !== compId).push(compId));
  },

  popupMove(payload) {
    let {compId, pos} = payload;
    this.state = this.state.mergeIn(['popups', 'state', compId, 'position'], pos);
  },

  popupOpen(payload) {
    let {component, compId} = payload;
    if (compId)
      this.state = this.state.updateIn(['popups', 'components'],
        (list) => list.filter((popupId) => popupId !== compId).push(compId));
    else {
      if (!component.component)
        component.component = EMPTY_TAB;
      component = Immutable.fromJS(component);
      let id = uid(10);
      this.state = this.state.setIn(['components', id], component);
      this.state = this.state.updateIn(['popups', 'components'], (list) => list.push(id));
    }
  },

  popupResize(payload) {
    let {compId, size} = payload;
    this.state = this.state.mergeIn(['popups', 'state', compId, 'size'], size);
  },

  popupToTab(payload) {
    this.tabOpen({switchTo: true, ...payload});
    this.popupClose(payload);
  },

  tabClose(payload, force) {
    let {compId} = payload;
    //Closing the start tab is a no-op
    if (!force && this.state.getIn(['components', compId, 'component']) === START_TAB)
      return;
    let pos = this.state.getIn(['tabs', 'components']).indexOf(compId);
    if (pos === -1)
      throw Error('Closed non-existant tab');
    let newTabs = this.state.getIn(['tabs', 'components']).delete(pos);
    this.state = this.state.setIn(['tabs', 'components'], newTabs);
    if (newTabs.size == 0) {
      this.tabOpen({
        component: {component: EMPTY_TAB},
        switchTo: true
      });
    } else {
      if (compId === this.state.getIn(['tabs', 'selectedTab']))
        if (pos < newTabs.size)
          this.state = this.state.setIn(['tabs', 'selectedTab'], newTabs.get(pos));
        else
          this.state = this.state.setIn(['tabs', 'selectedTab'], newTabs.last());
    }
  },

  tabOpen(payload) {
    let {component, switchTo, compId} = payload;
    if (compId)
      this.state = this.state.updateIn(['tabs', 'components'],
        (list) => list.filter((tabId) => tabId !== compId).push(compId));
    else {
      if (!component.component)
        component.component = EMPTY_TAB;
      component = Immutable.fromJS(component);
      compId = uid(10);
      this.state = this.state.setIn(['components', compId], component);
      this.state = this.state.updateIn(['tabs', 'components'], (list) => list.push(compId));
    }
    if (switchTo) {
      this.state = this.state.setIn(['tabs', 'selectedTab'], compId);
    }
  },
  tabPopOut(payload) {
    let {compId, pos} = payload;
    this.state = this.state.updateIn(['popups', 'components'],
      (list) => list.filter((popupId) => popupId !== compId).push(compId));
    if (pos)
      this.state = this.state.mergeIn(['popups', 'state', compId, 'position'], pos);
    this.tabClose(payload, true);
  },
  tabSwitch(payload) {
    this.state = this.state.setIn(['tabs', 'selectedTab'], payload.compId);
  },

  getState() {
    return this.state;
  },

  getLastNotification() {
    return this.lastNotification;
  },

  geneFound(payload) {
    let {geneId} = payload;
    this.state = this.state.updateIn(['foundGenes'], (list) => list.filter((foundGeneId) => foundGeneId !== geneId).push(geneId));
  },

  tableQueryUsed(payload) {
    let {table, query} = payload;
    //this.state = this.state.updateIn(['usedTableQueries'], (list) => list.filter((usedTableQuery) => { console.log('table equality: ' + (usedTableQuery.get('table') === table)); console.log('query equality: ' + (usedTableQuery.get('query') === query)); console.log('total equality: ' + (usedTableQuery.get('table') === table && usedTableQuery.get('query') === query)); return ((usedTableQuery.get('table') !== table) && (usedTableQuery.get('query') !== query)); }).push(Immutable.fromJS({table: table, query: query})));


    //this.state = this.state.updateIn(['usedTableQueries'], (list) => list.filter((usedTableQuery) => { console.log('always true'); return true; }).push(Immutable.fromJS({table: table, query: query})));
    //this.state = this.state.updateIn(['usedTableQueries'], (list) => list.filter((usedTableQuery) => { console.log('always false'); return false; }).push(Immutable.fromJS({table: table, query: query})));

    // Remove the query from the list, if it already exists.
    // Put the query at the top of the list.
    this.state = this.state.updateIn(['usedTableQueries'], (list) => list.filter((usedTableQuery) => (!(usedTableQuery.get('table') === table && usedTableQuery.get('query') === query))).unshift(Immutable.fromJS({table: table, query: query})));



  },

  // TODO: transfer this to persistent storage.
  tableQueryStore(payload) {
    let {table, query} = payload;
    this.state = this.state.updateIn(['storedTableQueries'], (list) => list.filter((storedTableQuery) => (storedTableQuery.get('table') !== table && storedTableQuery.get('query') !== query)).push(Immutable.fromJS({table: table, query: query})));
  }

});

module.exports = SessionStore;
