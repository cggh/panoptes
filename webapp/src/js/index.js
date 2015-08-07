const _ = require('lodash');
const React = require('react');
const Fluxxor = require('fluxxor');
const Immutable = require('immutable');
const Panoptes = require('components/Panoptes.js');

const LayoutStore = require('stores/LayoutStore');
const PanoptesStore = require('stores/PanoptesStore');

const LayoutActions = require('actions/LayoutActions');
const PanoptesActions = require('actions/PanoptesActions');
const APIActions = require('actions/APIActions');

const API = require('panoptes/API');

const InitialConfig = require('panoptes/InitialConfig');
const ErrorReport = require('panoptes/ErrorReporter.js');
const injectTapEventPlugin = require("react-tap-event-plugin");

import 'normalize.css';

//Needed for onTouchTap
//Can go away when react 1.0 release
//Check this repo:
//https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin();

function getAppState(location) {
  let match = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.exec(location)
  if (match)
    return API.fetchData(match[0]);
}

Promise.prototype.done = function(onFulfilled, onRejected) {
  this.then(onFulfilled, onRejected)
      .catch(function(e) {
        setTimeout(function() {
          console.log(e.stack);
          throw e;
        });
    })
  ;
};

Promise.all([InitialConfig(), getAppState(window.location)])
  .then((values) => {
    let [config, appState] = values;
    appState = appState || {};
    let stores = {
      //USE STATE FROM APPSTATE? THINK WE NEED TO REFACTOR TO SESSION SPECIFIC VS DATASET SPECIFIC VS USER SPECIFIC?
      PanoptesStore: new PanoptesStore({
        user:config.user,
        storedSubsets: config.subsets,
        defaultQueries: config.defaultQueries,
        storedQueries: config.storedQueries
      }),
      LayoutStore: new LayoutStore(appState.layout) //Can grab link state before this and initalise store with it.
    };

    //Listen to the stores and update the URL after storing the state, when it changes.
    let getState = () => {
      let state = Immutable.Map();
      state = state.set('layout', stores.LayoutStore.getState().delete('modal'));
      state = state.set('panoptes', stores.PanoptesStore.getState());
      return state;
    };
    let last_state = getState();
    let storeState = () => {
      let new_state = getState();
      if (!last_state.equals(new_state)) {
        last_state = new_state;
        API.storeData(new_state.toJS()).then((resp) => {
          window.history.pushState({}, `Panoptes: ${config.settings.name}`, `/${resp}`);
        });
      }

    };
    storeState = _.debounce(storeState, 200);
    stores.LayoutStore.on('change', storeState);
    stores.PanoptesStore.on('change', storeState);

    let actions = {
      layout: LayoutActions,
      panoptes: PanoptesActions,
      api: APIActions
    };

    let flux = new Fluxxor.Flux(stores, actions);
    React.render(<Panoptes flux={flux} config={config}/>, document.getElementById('main'));
  }).done();



