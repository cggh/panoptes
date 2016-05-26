import Fluxxor from 'fluxxor';
import Immutable from 'immutable';

import SQL from 'panoptes/SQL';

import Constants from '../constants/Constants';
//Not implemeted yet
const SESSION = Constants.SESSION; //eslint-disable-line no-unused-vars
const API = Constants.API;


let PanoptesStore = Fluxxor.createStore({

  initialize(init) {
    this.state = Immutable.fromJS(
      init
    );

    this.bindActions(
      API.FETCH_USER_SUCCESS, this.fetchUserSuccess
    );
  },

  fetchUserSuccess(payload) {
    this.state = this.state.set('user', payload);
    this.emit('change');
  },

  getStoredSubsetsFor(table) {
    return this.state.getIn(['storedSubsets', table]);
  },
  getDefaultTableQueryFor(table) {
    return this.state.getIn(['defaultTableQueries', table]);
  },
  getStoredTableQueriesFor(table) {
    return this.state.getIn(['storedTableQueries', table]);
  },

  setDefaultTableQuery(table, query) {
console.log('setDefaultTableQuery(table, query) table: ' + table);

console.log('setDefaultTableQuery this.config: %o', this.config);

        //TODO: The default query comes from the config, which derives from the database, which was loaded from a file.
        // i.e. this.getFlux().store('PanoptesStore').getDefaultTableQueryFor(this.props.table)
        // Setting the default query writes back to the config settings in the database, so is an isManager feature only.

        // servermodule/panoptesserver/update_default_query.py


    //servermodule/panoptesserver/update_default_query.py
    //TODO: UPDATE tablecatalog SET defaultQuery="{defaultQuery}" WHERE id="{id}"

  },
  setStoredTableQuery(table, query) {
console.log('setStoredTableQuery(table, query) table: ' + table);

    //TODO: in the storedqueries table for this dataset,
    // create an id and supply the name, tableid (e.g. variants), workspaceid (config.workspace?), and content (encoded query).

  },


  getState() {
    return this.state;
  }
});

module.exports = PanoptesStore;
