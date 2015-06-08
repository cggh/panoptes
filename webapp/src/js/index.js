const _ = require('lodash');
const React = require('react');
const Fluxxor = require('fluxxor');
const Panoptes = require('components/Panoptes.js');

const LayoutStore = require('stores/LayoutStore');
const PanoptesStore = require('stores/PanoptesStore');

const LayoutActions = require('actions/LayoutActions');
const PanoptesActions = require('actions/PanoptesActions');
const APIActions = require('actions/APIActions');

const InitialConfig = require('panoptes/InitialConfig');
const ErrorReport = require('panoptes/ErrorReporter.js');


InitialConfig()
  .then((config) => {
    let stores = {
      PanoptesStore: new PanoptesStore(config),
      LayoutStore: new LayoutStore()
    };

    let actions = {
      layout: LayoutActions,
      panoptes: PanoptesActions,
      api: APIActions
    };

    let flux = new Fluxxor.Flux(stores, actions);
    React.render(<Panoptes flux={flux}/>, document.getElementById('main'));
  }).done();



