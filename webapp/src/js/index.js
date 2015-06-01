const React = require('react');
const Fluxxor = require('fluxxor');
const Panoptes = require('components/Panoptes.js');
const LayoutStore = require('stores/LayoutStore');
const LayoutActions = require('actions/LayoutActions');

const Metadata = require('panoptes/Metadata');

let stores = {
  LayoutStore: new LayoutStore()
};

let actions = {
  layout: LayoutActions
};

let flux = new Fluxxor.Flux(stores, actions);
React.render(<Panoptes flux={flux}/>, document.getElementById('main'));

//Metadata.fetchMetadata(flux)
//  .then(data => console.log(data), error => {
//    throw error;
//  }).done();

