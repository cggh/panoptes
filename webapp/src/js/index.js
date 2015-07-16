const _ = require('lodash');
const React = require('react');
const Fluxxor = require('fluxxor');
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


InitialConfig()
  .then((config) => {
    let stores = {
      PanoptesStore: new PanoptesStore({
        user:config.user,
        storedSubsets: config.subsets,
        defaultQueries: config.defaultQueries,
        storedQueries: config.storedQueries
      }),
      LayoutStore: new LayoutStore() //Can grab link state before this and initalise store with it.
    };

    //Listen to the layout store and update the URL when it changes.
    let last_state = stores.LayoutStore.getState().delete('modal');
    stores.LayoutStore.on('change', _.debounce(() => {
      let new_state = stores.LayoutStore.getState().delete('modal');
      if (!last_state.equals(new_state)) {
        last_state = new_state;
        API.storeData(new_state.toJS()).then((resp) => {
          window.history.pushState({}, config.settings.name, `/${resp}`);
        });
      }
    }, 200));

    let actions = {
      layout: LayoutActions,
      panoptes: PanoptesActions,
      api: APIActions
    };

    let flux = new Fluxxor.Flux(stores, actions);
    React.render(<Panoptes flux={flux} config={config}/>, document.getElementById('main'));
  }).done();



