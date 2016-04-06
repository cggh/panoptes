import _debounce from 'lodash/debounce';

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
          component: 'containers/EmptyTab',
          props: {}
        }
      },
      tabs: {
        components: ['FirstTab'],
        selectedTab: 'FirstTab'
      },
      popups: {
        components: [],
        state: {}
      },
      modal: {}
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
        defaultQueries: config.defaultQueries,
        storedQueries: config.storedQueries
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
          window.history.pushState(newState.toJS(), `Panoptes: ${config.settings.name}`, `/${resp}`);
        });
      }

    };
    storeState = _debounce(storeState, 200);
    stores.SessionStore.on('change', storeState);
    stores.PanoptesStore.on('change', storeState);

    window.addEventListener('popstate', (event) => {
      backbutton = true;
      stores.SessionStore.emit('change');
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
    ReactDOM.render(
      <div>
        <Loading status="custom"> There was a problem fetching initial configuration: {err} </Loading>
      </div>
      , document.getElementById('main'));

  })
  .done();



