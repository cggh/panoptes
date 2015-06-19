const Fluxxor = require('fluxxor');
const Immutable = require('immutable');

const Constants = require('../constants/Constants');
const LAYOUT = Constants.LAYOUT;

//For mock data:
const SQL = require('panoptes/SQL');


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
        'T1': {
          component: 'ui/HelloWorld',
          props: {
            compId: 'T2',
            msg: 'WTF'
          }
        },
        'T2': {
          component: 'ui/HelloWorld',
          title: 'OMG TAB',
          faIcon: 'bookmark',
          props: {
            compId: 'T2',
            msg: 'OMG'
          }
        },
        'P1': {
          component: 'ui/HelloWorld',
          props: {
            compId: 'P1',
            msg: 'WTF'
          }
        },
        'P2': {
          component: 'ui/HelloWorld',
          props: {
            compId: 'P2',
            msg: 'OMG'
          }
        }
      },
      tabs: {
        selectedTab: 'Table',
        components: ['Table', 'T1', 'T2']
      },
      popups: {
        components: ['Table', 'P2'],
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
      modal: {}
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
      LAYOUT.TAB_SWITCH, this.tabSwitch
    );
  },

  componentUpdate(payload) {
    let {compId, newProps} = payload;
    this.state = this.state.mergeIn(['components', compId, 'props'], newProps)
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
    let pos = this.state.getIn(['tabs', 'components']).indexOf(compId);
    if (pos === -1)
      throw Error("Closed non-existant tab");
    let new_tabs = this.state.getIn(['tabs', 'components']).delete(pos);
    this.state = this.state.setIn(['tabs', 'components'], new_tabs);
    if (compId === this.state.getIn(['tabs', 'selectedTab']))
      if (pos < new_tabs.size)
        this.state = this.state.setIn(['tabs', 'selectedTab'], new_tabs.get(pos));
      else
        this.state = this.state.setIn(['tabs', 'selectedTab'], new_tabs.last());
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
