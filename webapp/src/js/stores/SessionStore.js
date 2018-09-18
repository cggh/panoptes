import React from 'react';
import {createStore} from 'fluxxor';
import Immutable from 'immutable';
import uid from 'uid';
import Constants from '../constants/Constants';
import _throttle from 'lodash.throttle';
const SESSION = Constants.SESSION;
import _isFunction from 'lodash.isfunction';
import _isEqual from 'lodash.isequal';

const EMPTY_TAB = 'containers/EmptyTab';
const START_TAB = 'containers/StartTab';

const INITIAL_POPUP_WIDTH_PIXELS = 700;
const INITIAL_POPUP_HEIGHT_PIXELS = 500;
const MIN_POPUP_WIDTH_PIXELS = 200;
const MIN_POPUP_HEIGHT_PIXELS = 150;
const CASCADE_OFFSET_PIXELS = 20;

let SessionStore = createStore({

  initialize(state) {
    this.state = Immutable.fromJS(state);
    this.modal = null;
    this.throttledStoreState = _throttle(() => this.emit('storeState'), 1000);

    this.bindActions(
      SESSION.COMPONENT_SET_PROPS, this.componentSetProps,
      SESSION.COMPONENT_REPLACE, this.emitIfNeeded(this.componentReplace),
      SESSION.MODAL_CLOSE, this.modalClose,
      SESSION.MODAL_OPEN, this.modalOpen,
      SESSION.MODAL_SET_PROPS, this.emitIfNeeded(this.modalSetProps),
      SESSION.NOTIFY, this.emitIfNeeded(this.notify, ['notify']),
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
      SESSION.APP_RESIZE, this.emitIfNeeded(this.appResize),
      SESSION.REUSE_OR_POPUP, this.emitIfNeeded(this.reuseOrPopup)
    );
  },

  emitIfNeeded(action, events=['change', 'storeState']) {
    return (payload) => {
      let oldState = this.state;
      action(payload);
      if (!oldState.equals(this.state) || events.includes('notify')) {
        events.forEach((event) => this.emit(event));
      }
    };
  },

  componentSetProps({componentPath, updater, throttleStoreState}) {
    let oldState = this.state;
    if (_isFunction(updater)) {
      this.state = this.state.updateIn(['components', ...componentPath, 'props'], updater);
    } else {
      this.state = this.state.mergeDeepIn(['components', ...componentPath, 'props'], updater);
    }
    if (!oldState.equals(this.state)) {
      this.emit('change');
      if(throttleStoreState) {
        this.throttledStoreState();
      } else {
        this.emit('storeState');
      }
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

  popupClose({compId, keep}) {
    let list = this.state.getIn(['popups', 'components']).filter((popupId) => popupId !== compId);
    this.state = this.state.setIn(['popups', 'components'], list);

    for (let i = 0, len = this.state.get('popupSlots').size; i < len; i++) {
      if (this.state.getIn(['popupSlots', i]) === compId) {
        this.state = this.state.setIn(['popupSlots', i], null);
        break;
      }
    }
    if (!keep) {
      this.deleteComponent(compId);
    }
  },

  popupFocus({compId}) {
    this.state = this.state.updateIn(['popups', 'components'],
      (list) => list.filter((popupId) => popupId !== compId).push(compId));
    this.useComponent(compId);
  },

  popupMove({compId, pos}) {
    this.state = this.state.mergeIn(['popups', 'state', compId, 'position'], pos);
  },

  popupOpen({component, compId, switchTo, size, pos}) {
    if (!compId) {
      compId = uid(10);
      this.state = this.state.setIn(['components', compId], component);
      this.state = this.state.updateIn(['popups', 'components'], (list) => list.push(compId));
    }
    if (switchTo) {
      this.popupFocus({compId});
    }

    if (!this.state.getIn(['popups', 'state', compId])) {

      // Set an initial size for the popup.
      this.state = this.state.setIn(['popups', 'state', compId, 'size'], Immutable.Map(size ||
        {
          width: INITIAL_POPUP_WIDTH_PIXELS,
          height: INITIAL_POPUP_HEIGHT_PIXELS
        }
      ));

      let newPos = undefined;
      if (!pos) {      // Set an initial position that avoids obscuring existing popups.
        // NB: This currently only avoids obscurring the inital positions (not modified positions) of existing popups.
        let nextPopupSlotIndex = this.state.get('popupSlots').size;

        for (let i = 0, len = this.state.get('popupSlots').size; i < len; i++) {
          if (this.state.getIn(['popupSlots', i]) === null) {
            nextPopupSlotIndex = i;
            break;
          }
        }

        if (nextPopupSlotIndex > this.state.get('popupSlots').size) {
          console.error('nextPopupSlotIndex > this.state.get(\'popupSlots\').size');
          console.info('nextPopupSlotIndex: %o', nextPopupSlotIndex);
          console.info('this.state.get(\'popupSlots\').size: %o', this.state.get('popupSlots').size);
          return null;
        }

        if (nextPopupSlotIndex === this.state.get('popupSlots').size) {
          this.state = this.state.set('popupSlots', this.state.get('popupSlots').push(compId));
        } else {
          this.state = this.state.setIn(['popupSlots', nextPopupSlotIndex], compId);
        }

        const headerAllowancePixels = 200; // Accommodate header and show at least part of popup
        let maxPopupsDown = Math.floor((window.innerHeight - headerAllowancePixels) / CASCADE_OFFSET_PIXELS);
        let maxPopupsAcross = Math.floor((window.innerWidth - headerAllowancePixels) / CASCADE_OFFSET_PIXELS);
        newPos = {
          x: 50 + (nextPopupSlotIndex % maxPopupsDown * CASCADE_OFFSET_PIXELS) + ((Math.floor(nextPopupSlotIndex / maxPopupsDown) % maxPopupsAcross) * CASCADE_OFFSET_PIXELS),
          y: 50 + (nextPopupSlotIndex % maxPopupsDown * CASCADE_OFFSET_PIXELS)
        };
      }
      this.state = this.state.setIn(['popups', 'state', compId, 'position'], Immutable.Map(
        newPos || pos
      ));
    }
  },

  popupResize({compId, size}) {
    this.state = this.state.mergeIn(['popups', 'state', compId, 'size'], size);
  },

  popupToTab(payload) {
    this.tabOpen({switchTo: true, ...payload});
    this.popupClose({keep: true, ...payload});
  },

  tabClose({compId, keep}, force) {
    //Closing the start tab is a no-op
    if (!force && this.state.getIn(['components', compId, 'type']) === START_TAB)
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
    if (!keep) {
      this.deleteComponent(compId);
    }
  },

  tabOpen({component, switchTo, compId}) {
    if (compId)
      this.state = this.state.updateIn(['tabs', 'components'],
        (list) => list.filter((tabId) => tabId !== compId).push(compId));
    else {
      this.state.get('mostRecentlyUsedComponents', Immutable.List())
        .forEach((existingCompId) => {
          if (this.state.getIn(['components', existingCompId, 'type']) === component.get('type')) {
            compId = existingCompId;
            return false;
          } else {
            return true;
          }
        });
      if (compId) {
        this.componentSetProps({componentPath: [compId], updater: component.get('props')});
      } else {
        compId = uid(10);
        this.state = this.state.setIn(['components', compId], component);
        this.state = this.state.updateIn(['tabs', 'components'], (list) => list.push(compId));
      }
    }
    if (switchTo) {
      this.state = this.state.setIn(['tabs', 'selectedTab'], compId);
      this.useComponent(compId);
    }
  },
  tabPopOut({compId, pos, size}) {
    this.popupOpen({compId, pos, size, switchTo: true});
    this.tabClose({compId, pos, keep: true}, true);
  },
  tabSwitch({compId}) {
    this.state = this.state.setIn(['tabs', 'selectedTab'], compId);
    this.useComponent(compId);
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

  geneFound({geneId, geneDesc}) {
    this.state = this.state.updateIn(['foundGenes'], (list) => list.filter((gene) => gene.get('geneId') !== geneId).unshift(Immutable.Map({geneId, geneDesc})));
  },

  tableQueryUsed({table, query}) {
    // Remove the query from the list, if it already exists.
    // Put the query at the top of the list.
    this.state = this.state.updateIn(['usedTableQueries'], (list) => list.filter((usedTableQuery) => (!(usedTableQuery.get('table') === table && usedTableQuery.get('query') === query))).unshift(Immutable.fromJS({table, query})));

  },

  appResize() {

    // Resize or move popups so their bounds fall within the new window size.
    let popups = this.state.getIn(['popups', 'components']);
    popups.map((compId) => {

      let position = this.state.getIn(['popups', 'state', compId, 'position']);
      let size = this.state.getIn(['popups', 'state', compId, 'size']);

      if (position === undefined || size === undefined) {
        console.error('position === undefined || size === undefined');
        console.info('position: %o', position);
        console.info('size: %o', size);
        return null;
      }

      let positionX = position.get('x');
      let positionY = position.get('y');
      let sizeWidth = size.get('width');
      let sizeHeight = size.get('height');

      if ((positionX + sizeWidth) >= window.innerWidth) {
        sizeWidth = window.innerWidth - positionX - 1;
        if (sizeWidth < MIN_POPUP_WIDTH_PIXELS) {
          positionX -= (MIN_POPUP_WIDTH_PIXELS - sizeWidth);
          sizeWidth = MIN_POPUP_WIDTH_PIXELS;
          positionX = positionX < 0 ? 0 : positionX;
        }
      }

      if ((positionY + sizeHeight) >= window.innerHeight) {
        sizeHeight = window.innerHeight - positionY - 1;
        if (sizeHeight < MIN_POPUP_HEIGHT_PIXELS) {
          positionY -= (MIN_POPUP_HEIGHT_PIXELS - sizeHeight);
          sizeHeight = MIN_POPUP_HEIGHT_PIXELS;
          positionY = positionY < 0 ? 0 : positionY;
        }
      }

      let newSize = {width: sizeWidth, height: sizeHeight};
      let newPosition = {x: positionX, y: positionY};

      if (!_isEqual(size, newSize)) {
        this.popupResize({compId, size: newSize});
      }

      if (!_isEqual(position, newPosition)) {
        this.popupMove({compId, pos: newPosition});
      }

    });

  },

  useComponent(compId) {
    this.state = this.state.update('mostRecentlyUsedComponents',
      Immutable.List(),
      (list) => list.filter((usedComp) => usedComp !== compId).unshift(compId));
  },

  deleteComponent(compId) {
    this.state = this.state.update('components',
      (components) => components.delete(compId));
    this.state = this.state.update('mostRecentlyUsedComponents',
      (components) => components.filter((comp) => comp !== compId));
  },

  reuseOrPopup({componentName, props}) {
    let existingCompId = null;
    this.state.get('mostRecentlyUsedComponents', Immutable.List())
      .forEach((compId) => {
        if (this.state.getIn(['components', compId, 'type']) === componentName) {
          existingCompId = compId;
          return false;
        } else {
          return true;
        }
      });
    if (existingCompId) {
      this.componentSetProps({componentPath: [existingCompId], updater: props});
      if (this.state.getIn(['popups', 'components']).has(existingCompId)) {
        this.popupFocus({compId: existingCompId});
      }
    } else {
      this.popupOpen({
        component: Immutable.fromJS({
          type: componentName,
          props
        }),
        switchTo: true
      });
    }
  }
});

export default SessionStore;
