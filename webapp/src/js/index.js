const _ = require('lodash');
const React = require('react');
const ReactDOM = require('react-dom');
const Fluxxor = require('fluxxor');
const Immutable = require('immutable');
const Panoptes = require('components/Panoptes.js');

const SessionStore = require('stores/SessionStore');
const PanoptesStore = require('stores/PanoptesStore');

const SessionActions = require('actions/SessionActions');
const PanoptesActions = require('actions/PanoptesActions');
const APIActions = require('actions/APIActions');

const API = require('panoptes/API');

const InitialConfig = require('panoptes/InitialConfig');
const injectTapEventPlugin = require('react-tap-event-plugin');


require('console-polyfill');

import 'normalize.css';

//Needed for onTouchTap
//Can go away when react 1.0 release
//Check this repo:
//https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin();


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
      state = state.set('session', stores.SessionStore.getState().delete('modal'));
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
    storeState = _.debounce(storeState, 200);
    stores.SessionStore.on('change', storeState);
    stores.PanoptesStore.on('change', storeState);

    window.addEventListener('popstate', (event) => {
      backbutton = true;
      //TODO If there is no state we are at the start so use default view
      stores.SessionStore.state = Immutable.fromJS(event.state.session).set('modal', Immutable.Map());
      stores.SessionStore.emit('change');
    });

    let actions = {
      session: SessionActions,
      panoptes: PanoptesActions,
      api: APIActions
    };

    let flux = new Fluxxor.Flux(stores, actions);
    ReactDOM.render(<Panoptes flux={flux} config={config}/>, document.getElementById('main'));
  }).done();



