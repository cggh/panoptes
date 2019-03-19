import '@babel/polyfill';
import 'string.prototype.startswith';
import createHistory from 'history/createBrowserHistory';
const history = createHistory();
import ComponentRegistry from 'util/ComponentRegistry';

//Needed for JSX
import React from 'react'; //eslint-disable-line no-unused-vars
import ReactDOM from 'react-dom';

import {Flux} from '@demiazz/fluxxor';
import Immutable from 'immutable';
import Loading from 'components/ui/Loading.js';

import SessionStore from 'stores/SessionStore';
import PanoptesStore from 'stores/PanoptesStore';
import ConfigStore from 'stores/ConfigStore';
import serialiseComponent from 'util/serialiseComponent';

import SessionActions from 'actions/SessionActions';
import PanoptesActions from 'actions/PanoptesActions';
import APIActions from 'actions/APIActions';

import API from 'panoptes/API';
import InitialConfig from 'panoptes/InitialConfig';
import DataItemViews from 'panoptes/DataItemViews';

// import Perf from 'react-addons-perf';
import _filter from 'lodash.filter';
import _clone from 'lodash.clone';
import _isEqual from 'lodash.isequal';

//Disable Perf for React 16 beta
// if (process.env.NODE_ENV !== 'production') { //eslint-disable-line no-undef
//   window.Perf = Perf;
// }

import 'console-polyfill';
import 'normalize.css';


// NOTE: process.env.URL_PATH_PREFIX is defined in webpack.config.js
// Alternatively, (slower but more adaptive) could call the server for env vars,
// but env seems unlikely to change and need a dynamic adaption between builds.
const datasetURLPathPrefix = process.env.URL_PATH_PREFIX; // eslint-disable-line no-undef
const initialUrlPath  = window.location.pathname;

if (initialUrlPath.indexOf(datasetURLPathPrefix) != 0) {
  console.warn('initialUrlPath did not start with the specified datasetURLPathPrefix: ', datasetURLPathPrefix);
}

// NOTE: only the first occurrence will be (and should be) replaced.
const datasetURLPath = initialUrlPath.replace(datasetURLPathPrefix, '');

// Get the datasetURLPathParts and filter out empty strings (and other falseys).
const datasetURLPathParts = _filter(datasetURLPath.split('/'));
const dataset = datasetURLPathParts[0];
const baseURLPath = `${datasetURLPathPrefix}/${dataset}/`;

if (dataset === undefined || dataset === null || dataset === '') {

  const datasetURLPathPrefixHtml = <span> after <em>{datasetURLPathPrefix}</em></span>;

  ReactDOM.render(
    <div>
      <Loading status="error">
        <div>No dataset specified in the URL{datasetURLPathPrefix ? datasetURLPathPrefixHtml : null}</div>
      </Loading>
    </div>
    , document.getElementById('main')
  );

} else {

  ReactDOM.render(
    <div><Loading status="loading-hide">Loading {dataset}...</Loading></div>,
    document.getElementById('main')
  );

  let promises = [InitialConfig(dataset)];
  const remainingPath = datasetURLPathParts.slice(1).join('/');
  window.rootURL = window.location.origin + process.env.URL_PATH_PREFIX + '/' + dataset;
  // Match the UID and nothing but the UID.
  const HASH_REGEX = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/;
  const matches = HASH_REGEX.exec(remainingPath);
  if (matches !== null && matches.length === 1) {
    // remainingPath is a UID, so fetch the state.
    promises.push(API.fetchData(matches[0]));
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

  let historyChangeCount = 0;
  Promise.all(promises)
    .then(([config, appState]) => {

      // NOTE: if remainingPath was a UID ("hash"),
      // appState would have been returned by the fetchData promise,

      if (appState === undefined) {
        if (remainingPath !== undefined && remainingPath !== '' && remainingPath !== 'index.html') {
          appState = _clone(config.settings.initialSessionState);
          if (config.tablesById[datasetURLPathParts[1]] !== undefined) {
            const table = datasetURLPathParts[1];
            const selectedPrimKey = datasetURLPathParts[2];
            if (config.tablesById[table].listView) {
              appState.session.components.URLTab = {
                type: 'ListWithActions',
                props: {table, selectedPrimKey}
              };
            } else if (selectedPrimKey !== undefined) {
              const children = DataItemViews.getViews(config.tablesById[table].dataItemViews, config.tablesById[table].hasGeoCoord).map(serialiseComponent);
              appState.session.components.URLTab = {
                type: 'DataItem',
                props: {table, primKey: selectedPrimKey, children}
              };
            } else {
              appState.session.components.URLTab = {
                type: 'DataTableWithActions',
                props: {table}
              };
            }
          } else if (config.feeds[datasetURLPathParts[1]] !== undefined) {
            if (datasetURLPathParts[2]) {
              appState.session.components.URLTab = {
                type: 'FeedItem',
                props: {feedId: datasetURLPathParts[1], itemId: datasetURLPathParts[2]}
              };
            } else {
              appState.session.components.URLTab = {
                type: 'FeedIndex',
                props: {id: datasetURLPathParts[1]}
              };
            }
          } else {
            appState.session.components.URLTab = {
              type: 'DocPage',
              props: {path: remainingPath}
            };
          }
          appState.session.tabs.components.push('URLTab');
          appState.session.tabs.selectedTab = 'URLTab';
        } else {
          appState = config.settings.initialSessionState;
        }
      }

      //Listen to the stores and update the URL after storing the state, when it changes.
      const stores = {
        PanoptesStore: new PanoptesStore({
          url: window.location.href
        }),
        SessionStore: new SessionStore(appState.session),
        ConfigStore: new ConfigStore(config)
      };

      const getState = () => {
        let state = Immutable.Map();
        state = state.set('session', stores.SessionStore.getState());
        return state;
      };

      let lastState = getState();

      const storeState = () => {
        historyChangeCount += 1;

        const newState = getState();

        if (!lastState.equals(newState)) {

          lastState = newState;

          // Set hasState to true if there are any statefull components.
          const statelessComponents = ['EmptyTab'];
          const tableComponents = ['ListWithActions', 'DataTableWithActions'];
          const pathComponents = ['DocPage'];

          let hasState = false;
          newState.get('session').get('components').keySeq().forEach((key) => {
            if (
              statelessComponents.indexOf(newState.get('session').get('components').get(key).get('type')) == -1
              && tableComponents.indexOf(newState.get('session').get('components').get(key).get('type')) == -1
              && pathComponents.indexOf(newState.get('session').get('components').get(key).get('type')) == -1
            ) {
              // There is a component that isn't stateless nor a table component, nor a path component.
              hasState = true;
              return;
            } else if (
              tableComponents.indexOf(newState.get('session').get('components').get(key).get('type')) !== -1
              && !_isEqual(newState.get('session').get('components').get(key).get('props').keySeq().toArray(), ['table', 'selectedPrimKey'])
            ) {
              // There is a tableComponents that has more than the URL-derivable table prop.
              hasState = true;
              return;
            } else if (
              pathComponents.indexOf(newState.get('session').get('components').get(key).get('type')) !== -1
              && !_isEqual(newState.get('session').get('components').get(key).get('props').keySeq().toArray(), ['path'])
              && !_isEqual(newState.get('session').get('components').get(key).get('props').keySeq().toArray(), ['path', 'setProps'])
            ) {
              // There is a pathComponent that has more than the URL-derivable path props.
              hasState = true;
              return;
            }
          });

          if (hasState) {
            //Push with current URL until we get the hash from the server
            history.push(history.location.pathname, newState.toJS());
            const ourPushCount = historyChangeCount;

            API.storeData(newState.toJS()).then((hash) => {
              if (ourPushCount === historyChangeCount) {
                //If we are still relevant then update the URL
                const url = baseURLPath + hash;
                history.replace(url, newState.toJS());
                stores.PanoptesStore.updateURL(window.location.origin + url)
              }
            }
            );
          } else {

            const selectedTabComponentKey = newState.get('session').get('tabs').get('selectedTab');
            const selectedTabComponent = newState.get('session').get('components').get(selectedTabComponentKey);

            if (tableComponents.indexOf(selectedTabComponent.get('type')) !== -1) {

              const selectedTabTable = selectedTabComponent.get('props').get('table');
              const selectedTabTablePrimKey = selectedTabComponent.get('props').get('selectedPrimKey');
              const url = baseURLPath + selectedTabTable + '/' + selectedTabTablePrimKey;
              history.push(url, newState.toJS());
              stores.PanoptesStore.updateURL(window.location.origin + url)


            } else if (selectedTabComponent.get('type') === 'DocPage') {

              const selectedTabDocPagePath = selectedTabComponent.get('props').get('path');
              const url = baseURLPath + selectedTabDocPagePath;
              history.push(url, newState.toJS());
              stores.PanoptesStore.updateURL(window.location.origin + url)


            } else {
              // This may be a new, blank tab.
              //console.warn('selectedTab has no state or path');
              history.push(baseURLPath, newState.toJS());
              stores.PanoptesStore.updateURL(window.location.origin + baseURLPath);
            }

          }
        }

      };

      stores.SessionStore.on('storeState', storeState);

      //Replace our current navigation point with one with a state.
      history.replace(history.location.pathname, appState);

      history.listen((location, action) => {
        if (action === 'POP') {
          if (stores.SessionStore.modal) {
            stores.SessionStore.modalClose();
            history.push(location, action);
            stores.PanoptesStore.updateURL(location);
          } else {
            historyChangeCount += 1;
            const newState = Immutable.fromJS((location.state ? location.state.session : {}));
            if (!newState.equals(stores.SessionStore.state)) {
              stores.SessionStore.state = newState;
              stores.SessionStore.emit('change');
            }
            stores.PanoptesStore.updateURL(window.location.href);
          }
        }
      });

      const actions = {
        session: SessionActions,
        panoptes: PanoptesActions(config),
        api: APIActions
      };

      let flux = new Flux(stores, actions);

      flux.setDispatchInterceptor((action, dispatch) =>
        ReactDOM.unstable_batchedUpdates(() =>
          dispatch(action)
        )
      );
      ReactDOM.render(
        <div>
          <Loading status="done"/>
          {React.createElement(ComponentRegistry(config.settings.topLevelComponent), {flux})}
        </div>
        , document.getElementById('main')
      );

    })
    .catch((err) => {

      let errJson = null;

      try {
        errJson = JSON.parse(err.responseText);
      } catch (err) {}

      let render = <Loading status="error">
        {err.responseText || err.message || 'Error'}
      </Loading>;

      if (errJson && err.status == 403) {
        render = <div>
          <Loading status="custom">
            You ({errJson.userid}) do not have permission to read this dataset<br/>
            {errJson.userid == 'anonymous' && errJson.cas ?
              <a href={`${errJson.cas}?service=${window.location.href}`}>Login</a>
              : <a href={errJson.cas_logout}>Logout</a>}
          </Loading>
        </div>;
      }

      ReactDOM.render(render, document.getElementById('main'));

      throw err;
    })
    .done();
}
