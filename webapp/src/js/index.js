import _debounce from 'lodash/debounce';
import createHistory from 'history/createBrowserHistory';
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
import ConfigStore from 'stores/ConfigStore';

import SessionActions from 'actions/SessionActions';
import PanoptesActions from 'actions/PanoptesActions';
import APIActions from 'actions/APIActions';

import API from 'panoptes/API';

import InitialConfig from 'panoptes/InitialConfig';
import injectTapEventPlugin from 'react-tap-event-plugin';

import Perf from 'react-addons-perf';
import _filter from 'lodash/filter';

if (process.env.NODE_ENV !== 'production') { //eslint-disable-line no-undef
  window.Perf = Perf;
}

import 'console-polyfill';
import 'normalize.css';

//Needed for onTouchTap
//Can go away when react 1.0 release
//Check this repo:
//https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin();


const HASH_REGEX = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/;

function getDatasetAndStateUID(location) {
  location = location.pathname.split('/');
  location = _filter(location);
  const start = Math.max(0, location.length - 2);
  const end = Math.min(start + 2, location.length);
  location = location.slice(start, end);
  if (location[0] === 'panoptes') {  //Remove panoptes part of path if needed.
    location.shift();
  }
  if (location.length === 0)
    return {};
  if (location.length === 1)
    return {dataset: location[0], stateUID: null};
  let match = HASH_REGEX.exec(location[1]);
  if (match) {
    return {dataset: location[0], stateUID: match[0]};
  } else {
    return {dataset: location[1], stateUID: null};
  }
}

Promise.prototype.done = function (onFulfilled, onRejected) {
  this.then(onFulfilled, onRejected)
    .catch((e) => {
      setTimeout(() => {
        console.log(e.stack);
        throw e;
      });
    })
  ;
};

const {dataset, stateUID} = getDatasetAndStateUID(window.location);
if (dataset) {
  ReactDOM.render(<div><Loading status="loading-hide">Loading {dataset}...</Loading>
  </div>, document.getElementById('main'));
  let promises = [InitialConfig(dataset)];
  if (stateUID) {
    promises.push(API.fetchData(stateUID));
  }
  Promise.all(promises)
    .then(([config, appState]) => {
      const defaultState = {
        session: {
          components: {
            FirstTab: config.docs['index.html'] ? {
              type: 'DocPage',
              props: {
                path: 'index.html'
              }
            } : {
              type: 'EmptyTab'
            }
          },
          tabs: {
            components: ['FirstTab'],
            selectedTab: 'FirstTab',
            unclosableTabs: ['FirstTab'],
            unreplaceableTabs: ['FirstTab']
          },
          popups: {
            components: [],
            state: {}
          },
          foundGenes: [],
          usedTableQueries: [],
          popupSlots: []
        }
      };
      appState = appState ? appState : (
        config.settings.initialSessionState ? {session: config.settings.initialSessionState} : (defaultState));

      let stores = {
        PanoptesStore: new PanoptesStore({
          storedSubsets: {}
        }),
        SessionStore: new SessionStore(appState.session),
        ConfigStore: new ConfigStore(config)
      };

      //Listen to the stores and update the URL after storing the state, when it changes.
      let getState = () => {
        let state = Immutable.Map();
        state = state.set('session', stores.SessionStore.getState());
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
          API.storeData(newState.toJS()).then((hash) => {
            const newLocation = (HASH_REGEX.exec(window.location.pathname) ||
            window.location.pathname[window.location.pathname.length - 1] === '/') ?
              hash : `${dataset}/${hash}`;
            history.push(newLocation, newState.toJS());
          });
        }

      };
      storeState = _debounce(storeState, 250);
      stores.SessionStore.on('change', storeState);

      //Replace our current navigation point with one with a state.
      history.replace(history.location.pathname, appState);
      history.listen((location, action) => {
        if (action === 'POP') {
          let newState = Immutable.fromJS((location.state ? location.state.session : {}));
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

      flux.setDispatchInterceptor((action, dispatch) =>
        ReactDOM.unstable_batchedUpdates(() =>
          dispatch(action)
        )
      );

      ReactDOM.render(
        <div>
          <Loading status="done"/>
          <Panoptes flux={flux}/>
        </div>
        , document.getElementById('main'));
    })
    .catch((err) => {
      ReactDOM.render(
        <div>
          <Loading status="error">
            {err.responseText || err.message || 'Error'}
          </Loading>
        </div>
        , document.getElementById('main'));
      throw err;
    })
    .done();
} else {
  ReactDOM.render(
    <div>
      <Loading status="error">
        No dataset selected, append an ID of one to your URL
      </Loading>
    </div>
    , document.getElementById('main'));
}
