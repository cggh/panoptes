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



InitialConfig()
  .then((config) => {
    let stores = {
      LayoutStore: new LayoutStore(),
      PanoptesStore: new PanoptesStore(config)
    };

    let actions = {
      layout: LayoutActions,
      panoptes: PanoptesActions,
      api: APIActions
    };

    let flux = new Fluxxor.Flux(stores, actions);
    React.render(<Panoptes flux={flux}/>, document.getElementById('main'));
  }).done();



