import React from 'react';
import Fluxxor from 'fluxxor';
import Immutable from 'immutable';
import uid from 'uid';
import Constants from '../constants/Constants';
const SESSION = Constants.SESSION;
import _isFunction from 'lodash/isFunction';
import _isEqual from 'lodash/isEqual';

const EMPTY_TAB = 'containers/EmptyTab';
const START_TAB = 'containers/StartTab';

const MIN_POPUP_WIDTH_PIXELS = 200;
const MIN_POPUP_HEIGHT_PIXELS = 150;
const CASCADE_OFFSET_PIXELS = 20;

let SessionStore = Fluxxor.createStore({

  initialize(state) {
    this.state = Immutable.fromJS(state);
    this.modal = null;

    this.bindActions(
      SESSION.COMPONENT_SET_PROPS, this.emitIfNeeded(this.componentSetProps),
      SESSION.COMPONENT_REPLACE, this.emitIfNeeded(this.componentReplace),
      SESSION.MODAL_CLOSE, this.modalClose,
      SESSION.MODAL_OPEN, this.modalOpen,
      SESSION.MODAL_SET_PROPS, this.emitIfNeeded(this.modalSetProps),
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
      SESSION.APP_RESIZE, this.emitIfNeeded(this.appResize)
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

  componentSetProps({componentPath, updater}) {
    if (_isFunction(updater)) {
      this.state = this.state.updateIn(['components', ...componentPath, 'props'], updater);
    } else {
      this.state = this.state.mergeDeepIn(['components', ...componentPath, 'props'], updater);
    }
  },

  componentReplace({componentPath, newComponent}) {
    this.state = this.state.setIn(['components', ...componentPath], newComponent);
  },


  modalClose() {
    this.modal = null;
    this.emit('change');
  },

  modalOpen(payload) {
    this.modal = payload;
    this.emit('change');
  },

  modalSetProps({updater}) {
    if (_isFunction(updater)) {
      this.modal = React.cloneElement(this.modal, updater(this.modal.props));
    } else {
      this.modal = React.cloneElement(this.modal, updater);
    }
    this.emit('change');
  },

  notify(payload) {
    this.lastNotification = payload;
  },

  popupClose({compId}) {
    let list = this.state.getIn(['popups', 'components']).filter((popupId) => popupId !== compId);
    this.state = this.state.setIn(['popups', 'components'], list);
  },

  popupFocus({compId}) {
    this.state = this.state.updateIn(['popups', 'components'],
      (list) => list.filter((popupId) => popupId !== compId).push(compId));
  },

  popupMove({compId, pos}) {
    this.state = this.state.mergeIn(['popups', 'state', compId, 'position'], pos);
  },

  popupOpen({component, compId, switchTo}) {
    if (compId) {
      this.state = this.state.updateIn(['popups', 'components'],
        (list) => list.filter((popupId) => popupId !== compId).push(compId));
    } else {
      compId = uid(10);
      this.state = this.state.setIn(['components', compId], component);
      this.state = this.state.updateIn(['popups', 'components'], (list) => list.push(compId));
      if (switchTo) {
        this.popupFocus({compId: compId});
      }
    }
    //Set an initial position to prevent opening over an existing popup
    if (!this.state.getIn(['popups', 'state', compId])) {
      let numPopups = this.state.get('numPopupsOpened') || 0;
      //150 accommodates header and allows some part of popup to be shown
      let maxPopupsDown = Math.floor((window.innerHeight  - 200) / CASCADE_OFFSET_PIXELS);
      let maxPopupsAcross = Math.floor((window.innerWidth  - 200) / CASCADE_OFFSET_PIXELS);
      this.state = this.state.set('numPopupsOpened', numPopups + 1);
      this.state = this.state.setIn(['popups', 'state', compId, 'position'], Immutable.Map(
        {
          x: 50 + (numPopups % maxPopupsDown * CASCADE_OFFSET_PIXELS) + ((Math.floor(numPopups / maxPopupsDown) % maxPopupsAcross) * CASCADE_OFFSET_PIXELS),
          y: 50 + (numPopups % maxPopupsDown * CASCADE_OFFSET_PIXELS)
        }
      ));
    }

  },

  popupResize({compId, size}) {
    this.state = this.state.mergeIn(['popups', 'state', compId, 'size'], size);
  },

  popupToTab(payload) {
    this.tabOpen({switchTo: true, ...payload});
    this.popupClose(payload);
  },

  tabClose({compId}, force) {
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

  tabOpen({component, switchTo, compId}) {
    if (compId)
      this.state = this.state.updateIn(['tabs', 'components'],
        (list) => list.filter((tabId) => tabId !== compId).push(compId));
    else {
      compId = uid(10);
      this.state = this.state.setIn(['components', compId], component);
      this.state = this.state.updateIn(['tabs', 'components'], (list) => list.push(compId));
    }
    if (switchTo) {
      this.state = this.state.setIn(['tabs', 'selectedTab'], compId);
    }
  },
  tabPopOut({compId, pos}) {
    this.state = this.state.updateIn(['popups', 'components'],
      (list) => list.filter((popupId) => popupId !== compId).push(compId));
    if (pos)
      this.state = this.state.mergeIn(['popups', 'state', compId, 'position'], pos);
    this.tabClose({compId, pos}, true);
  },
  tabSwitch({compId}) {
    this.state = this.state.setIn(['tabs', 'selectedTab'], compId);
  },

  getState() {
    return this.state;
  },

  getModal() {
    return this.modal;
  },

  getLastNotification() {
    return this.lastNotification;
  },

  geneFound({geneId}) {
    this.state = this.state.updateIn(['foundGenes'], (list) => list.filter((foundGeneId) => foundGeneId !== geneId).push(geneId));
  },

  tableQueryUsed({table, query}) {
    // Remove the query from the list, if it already exists.
    // Put the query at the top of the list.
    this.state = this.state.updateIn(['usedTableQueries'], (list) => list.filter((usedTableQuery) => (!(usedTableQuery.get('table') === table && usedTableQuery.get('query') === query))).unshift(Immutable.fromJS({table: table, query: query})));

  },

  appResize() {

    // Trim popups
    let popups = this.state.getIn(['popups', 'components']);

    popups.map((compId) => {

      let position = this.state.getIn(['popups', 'state', compId, 'position']);
      let size = this.state.getIn(['popups', 'state', compId, 'size']);

      if (position !== undefined && size !== undefined) {
        let positionX = position.get('x');
        let positionY = position.get('y');
        let sizeWidth = size.get('width');
        let sizeHeight = size.get('height');

        // Trim window size to fit viewport.
        if ((positionX + sizeWidth) >= window.innerWidth) {
          sizeWidth = window.innerWidth - positionX - 1;
          if (sizeWidth < MIN_POPUP_WIDTH_PIXELS) {
            sizeWidth = MIN_POPUP_WIDTH_PIXELS;
          }
        }
        if ((positionY + sizeHeight) >= window.innerHeight) {
          sizeHeight = window.innerHeight - positionY - 1;
          if (sizeHeight < MIN_POPUP_HEIGHT_PIXELS) {
            sizeHeight = MIN_POPUP_HEIGHT_PIXELS;
          }
        }

        let newSize = Immutable.Map({width: sizeWidth, height: sizeHeight});

        if (!_isEqual(size, newSize)) {
          this.state = this.state.mergeIn(['popups', 'state', compId, 'size'], newSize);
        }
      }
    });

  }

});

export default SessionStore;
