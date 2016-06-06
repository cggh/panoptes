import _debounce from 'lodash/debounce';
import { createHistory } from 'history';
const history = createHistory();

//Needed for JSX
import React from 'react'; //eslint-disable-line no-unused-vars
import ReactDOM from 'react-dom';
import Fluxxor from 'fluxxor';
import Immutable from 'immutable';
import Panoptes from 'components/Panoptes.js';
import Loading from 'components/ui/Loading.js';

import SessionStore from 'stores/SessionStore';
import PanoptesStore from 'stores/PanoptesStore';

import SessionActions from 'actions/SessionActions';
import PanoptesActions from 'actions/PanoptesActions';
import APIActions from 'actions/APIActions';

import API from 'panoptes/API';

import InitialConfig from 'panoptes/InitialConfig';
import injectTapEventPlugin from 'react-tap-event-plugin';


import 'console-polyfill';
import 'normalize.css';

//Needed for onTouchTap
//Can go away when react 1.0 release
//Check this repo:
//https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin();

//Throw up a loader till we are ready
ReactDOM.render(<div><Loading status="loading-hide"/></div>, document.getElementById('main'));

function getAppState(location) {
  let match = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.exec(location);
  let defaultState = {
    session: {
      components: {
        FirstTab: {
          component: 'containers/StartTab',
          props: {}
        }
      },
      tabs: {
        components: ['FirstTab'],
        selectedTab: 'FirstTab',
        unclosableTab: 'FirstTab'
      },
      popups: {
        components: [],
        state: {}
      },
      modal: {},
      foundGenes: [],
      usedTableQueries: []
    }
  };

  if (match)
    return API.fetchData(match[0]).then((appState) => appState || defaultState
    );
  else
    return defaultState;
}

Promise.prototype.done = function(onFulfilled, onRejected) {
  this.then(onFulfilled, onRejected)
    .catch((e) => {
      setTimeout(() => {
        console.log(e.stack);
        throw e;
      });
    })
  ;
};

Promise.all([InitialConfig(), getAppState(window.location)])
  .then((values) => {
    let [config, appState] = values;
    let stores = {
      //USE STATE FROM APPSTATE? THINK WE NEED TO REFACTOR TO SESSION SPECIFIC VS DATASET SPECIFIC VS USER SPECIFIC?
      PanoptesStore: new PanoptesStore({
        user: config.user,
        storedSubsets: config.subsets,
        defaultTableQueries: config.defaultTableQueries,
        storedTableQueries: config.storedTableQueries
      }),
      SessionStore: new SessionStore(appState.session)
    };

    //Listen to the stores and update the URL after storing the state, when it changes.
    let getState = () => {
      let state = Immutable.Map();
      //Clear the modal as we don't want that to be stored
      state = state.set('session', stores.SessionStore.getState().set('modal', Immutable.Map()));
      state = state.set('panoptes', stores.PanoptesStore.getState());
      return state;
    };
    let lastState = getState();
    //Store if state change was due to backbutton - if it was then don't store it again.
    let backbutton = null;
    let storeState = () => {
      if (backbutton) {
        backbutton = false;
        return;
      }
      backbutton = false;
      let newState = getState();
      if (!lastState.equals(newState)) {
        lastState = newState;
        API.storeData(newState.toJS()).then((resp) => {
          history.push({
            state: newState.toJS(),
            pathname: `/${resp}`
          });
        });
      }

    };
    storeState = _debounce(storeState, 250);
    stores.SessionStore.on('change', storeState);
    stores.PanoptesStore.on('change', storeState);

    history.listen((location) => {
      if (location.action === 'POP') {
        let newState = Immutable.fromJS((location.state ? location.state.session : null) || getAppState(location.pathname).session);
        if (!newState.equals(stores.SessionStore.state)) {
          stores.SessionStore.state = newState;
          backbutton = true;
          stores.SessionStore.emit('change');
        }
      }
    });

    let actions = {
      session: SessionActions,
      panoptes: PanoptesActions(config),
      api: APIActions
    };

    let flux = new Fluxxor.Flux(stores, actions);
    ReactDOM.render(
      <div>
        <Loading status="done"/>
        <Panoptes flux={flux} config={config}/>
      </div>
      , document.getElementById('main'));
  })
  .catch((err) => {
    console.error(err);
    err = err.message || err.responseText || 'Could not connect to server';
    let appState = getAppState();
    appState.session.components = {
      error: {
        component: 'containers/ErrorTab',
        props: {
          err: err
        }
      }
    };
    appState.session.tabs = {
      components: ['error'],
      selectedTab: 'error'
    };

    let config = {
      ...initialConfig,
      isManager: true, //Should come from server in html really?
      settings: {
        name: initialConfig.dataset
      }
    };
    let stores = {
      PanoptesStore: new PanoptesStore({
        user: {
          id: initialConfig.userID,
          isManager: true
        }
      }),
      SessionStore: new SessionStore(appState.session)
    };
    let actions = {
      session: SessionActions,
      panoptes: PanoptesActions(config),
      api: APIActions
    };

    let flux = new Fluxxor.Flux(stores, actions);

    ReactDOM.render(
      <div>
        <Loading status="done"/>
        <Panoptes flux={flux} config={config}/>
      </div>
      , document.getElementById('main'));

  })
  .done();
