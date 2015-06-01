const Fluxxor = require('fluxxor');
const Immutable = require('immutable');

const Constants = require('../constants/Constants');
const LAYOUT = Constants.LAYOUT;

var PanoptesStore = Fluxxor.createStore({

  initialize(initial_config) {
    this.state = Immutable.fromJS({
      dataset: initialConfig.dataset,
      userID: 'Anonymous',
      userIsManager: false,
      chromosomes: initialConfig.chromosomes,
      tables: initialConfig.mapTableCatalog,
      twoDTables: initialConfig.map2DTableCatalog,
      settings: initialConfig.generalSettings
    });
    console.log(this.state.toJS());

    this.bindActions(
    );
  },


  getState() {
    return this.state;
  }

});

module.exports = PanoptesStore;
