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
  getDefaultQueryFor(table) {
    return this.state.getIn(['defaultQueries', table]);
  },
  getLastQueryFor(table) {
console.log('getLastQueryFor table: ' + table);
    let last = this.state.getIn(['lastQuery', table]);
console.log('last: %o', last);
    return last || SQL.WhereClause.encode(SQL.WhereClause.Trivial());
  },
  getStoredQueriesFor(table) {
    return this.state.getIn(['storedQueries', table]);
  },
  getState() {
    return this.state;
  },


  setDefaultQuery(table, query) {
    //servermodule/panoptesserver/update_default_query.py
    //TODO: UPDATE tablecatalog SET defaultQuery="{defaultQuery}" WHERE id="{id}"
console.log('setDefaultQuery(table, query) table: ' + table);
  },
  setLastQuery(table, query) {
    this.state.setIn(['lastQuery', table], query);
console.log('setLastQuery(table, query) table: ' + table);
console.log('setLastQuery query: %o', query);
  },
  setStoredQuery(table, query) {
    //TODO: in the storedqueries table for this dataset,
    // create an id and supply the name, tableid (e.g. variants), workspaceid (config.workspace?), and content (encoded query).
console.log('setStoredQuery(table, query) table: ' + table);
  }

});

module.exports = PanoptesStore;
