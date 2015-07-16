const Fluxxor = require('fluxxor');
const Immutable = require('immutable');
const uid = require('uid');
const Constants = require('../constants/Constants');
const LAYOUT = Constants.LAYOUT;

//For mock data:
const SQL = require('panoptes/SQL');

const EMPTY_TAB = 'containers/EmptyTab'

var LayoutStore = Fluxxor.createStore({

  initialize() {
    this.state = Immutable.fromJS({
      components: {
        'Table': {
          component: 'containers/DataTableWithQuery',
          props: {
            compId: 'Table',
            dataset: initialConfig.dataset,
            table: 'variants',
            query: SQL.WhereClause.encode(SQL.WhereClause.Trivial()),
            order: null
            //columns etc.

          }
        },
        'EmptyTab': {
          component: EMPTY_TAB
        },
      },
      tabs: {
        selectedTab: 'Table',
        components: [ 'EmptyTab']
      },
      popups: {
        //components: ['Table'],
        components: [],
        state: {
          'P2': {
            position: {
              x: 500,
              y: 100
            },
            size: {
              width: 300,
              height: 200
            }
          }
        }
      },
      modal: {
        component:'containers/QueryPicker',
        props: {
          table: 'variants'
        }
      }
    });

    this.bindActions(
      LAYOUT.COMPONENT_UPDATE, this.componentUpdate,
      LAYOUT.MODAL_CLOSE, this.modalClose,
      LAYOUT.MODAL_OPEN, this.modalOpen,
      LAYOUT.NOTIFY, this.notify,
      LAYOUT.POPUP_CLOSE, this.popupClose,
      LAYOUT.POPUP_FOCUS, this.popupFocus,
      LAYOUT.POPUP_MOVE, this.popupMove,
      LAYOUT.POPUP_RESIZE, this.popupResize,
      LAYOUT.TAB_CLOSE, this.tabClose,
      LAYOUT.TAB_OPEN, this.tabOpen,
      LAYOUT.TAB_SWITCH, this.tabSwitch
    );
  },

  componentUpdate(payload) {
    let {compId, newProps, newComponent} = payload;
    if (newComponent) {
      let component = Immutable.fromJS({
        component: newComponent,
        props: newProps
      });
      this.state = this.state.setIn(['components', compId], component);
    }
    else
      this.state = this.state.mergeIn(['components', compId, 'props'], newProps);

    this.emit('change');
  },
  modalClose() {
    this.state = this.state.set('modal', Immutable.Map());
    this.emit('change');
  },

  modalOpen(payload) {
    this.state = this.state.set('modal', Immutable.fromJS(payload));
    this.emit('change');
  },

  notify(payload) {
    this.lastNotification = payload;
    this.emit('notify');
  },

  popupClose(payload) {
    let {compId} = payload;
    let list = this.state.getIn(['popups', 'components']).filter((popupId) => popupId !== compId);
    this.state = this.state.setIn(['popups', 'components'], list);
    this.emit('change');
  },

  popupFocus(payload) {
    let {compId} = payload;
    let list = this.state.getIn(['popups', 'components']).filter((popupId) => popupId !== compId);
    list = list.push(compId);
    this.state = this.state.setIn(['popups', 'components'], list);
    this.emit('change');
  },

  popupMove(payload) {
    let {compId, pos} = payload;
    this.state = this.state.mergeIn(['popups', 'state', compId, 'position'], pos);
    this.emit('change');
  },

  popupResize(payload) {
    let {compId, size} = payload;
    this.state = this.state.mergeIn(['popups', 'state', compId, 'size'], size);
    this.emit('change');
  },

  tabClose(payload) {
    let {compId} = payload;
    //Closing the lone empty tab is a no-op
    if (this.state.getIn(['tabs', 'components']).size == 1 &&
        this.state.getIn(['components', compId, 'component']) === EMPTY_TAB)
      return;
    let pos = this.state.getIn(['tabs', 'components']).indexOf(compId);
    if (pos === -1)
      throw Error("Closed non-existant tab");
    let new_tabs = this.state.getIn(['tabs', 'components']).delete(pos);
    this.state = this.state.setIn(['tabs', 'components'], new_tabs);
    if (new_tabs.size == 0) {
      this.tabOpen({
        component: {component:EMPTY_TAB},
        switchTo: true
      });
    } else {
      if (compId === this.state.getIn(['tabs', 'selectedTab']))
        if (pos < new_tabs.size)
          this.state = this.state.setIn(['tabs', 'selectedTab'], new_tabs.get(pos));
        else
          this.state = this.state.setIn(['tabs', 'selectedTab'], new_tabs.last());
      this.emit('change');
    }
  },
  tabOpen(payload) {
    let {component, switchTo} = payload;
    if (!component.component)
      component.component = EMPTY_TAB;
    component = Immutable.fromJS(component);
    let id = uid(10);
    this.state = this.state.setIn(['components', id], component);
    this.state = this.state.updateIn(['tabs', 'components'], (list) => list.push(id));
    if (switchTo)
      this.state = this.state.setIn(['tabs', 'selectedTab'], id);
    this.emit('change');
  },
  tabSwitch(payload) {
    this.state = this.state.setIn(['tabs', 'selectedTab'], payload.compId);
    this.emit('change');
  },

  getState() {
    return this.state;
  },

  getLastNotification() {
    return this.lastNotification;
  }

});

module.exports = LayoutStore;
