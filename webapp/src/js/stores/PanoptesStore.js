import Fluxxor from 'fluxxor';
import Immutable from 'immutable';

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
      API.FETCH_USER_SUCCESS, this.fetchUserSuccess,
      API.FETCH_USER_FAIL, this.fetchUserFail,
      API.STORE_TABLE_QUERY_SUCCESS, this.storeTableQuerySuccess,
      API.STORE_TABLE_QUERY_FAIL, this.storeTableQueryFail,
      API.DELETE_STORED_TABLE_QUERY_SUCCESS, this.deleteStoredTableQuerySuccess,
      API.DELETE_STORED_TABLE_QUERY_FAIL, this.deleteStoredTableQueryFail,
      API.SET_DEFAULT_TABLE_QUERY_SUCCESS, this.setDefaultTableQuerySuccess,
      API.SET_DEFAULT_TABLE_QUERY_FAIL, this.setDefaultTableQueryFail
    );
  },

  fetchUserSuccess(payload) {
    this.state = this.state.set('user', payload);
    this.emit('change');
  },
  fetchUserFail(payload) {
    console.error('fetchUserFail: %o', payload);
  },

  storeTableQuerySuccess(payload) {
    let {id, table, query, name} = payload;
    let storedTableQueriesForTable = this.state.getIn(['storedTableQueries', table]);
    const newStoredTableQuery = Immutable.fromJS({id: id, table: table, query: query, name: name});
    // FIXME: id_ prefix being used to workaround lowercasing of config keys.
    const newStoredTableQueriesForTable = storedTableQueriesForTable.set('id_' + id, newStoredTableQuery);
    this.state = this.state.setIn(['storedTableQueries', table], newStoredTableQueriesForTable);
    this.emit('change');
  },
  storeTableQueryFail(payload) {
    console.error('storeTableQueryFail: %o', payload);
  },

  deleteStoredTableQuerySuccess(payload) {
    let {table, id} = payload;
    let storedTableQueriesForTable = this.state.getIn(['storedTableQueries', table]);
    // FIXME: id_ prefix being used to workaround lowercasing of config keys.
    const newStoredTableQueriesForTable = storedTableQueriesForTable.delete('id_' + id);
    this.state = this.state.setIn(['storedTableQueries', table], newStoredTableQueriesForTable);
    this.emit('change');
  },
  deleteStoredTableQueryFail(payload) {
    console.error('deleteStoredTableQueryFail: %o', payload);
  },

  setDefaultTableQuerySuccess(payload) {
    let {table, query} = payload;
    this.state = this.state.setIn(['defaultTableQueries', table], query);
    this.emit('change');
  },
  setDefaultTableQueryFail(payload) {
    console.error('setDefaultTableQueryFail: %o', payload);
  },

  getState() {
    return this.state;
  },
  getStoredSubsetsFor(table) {
    return this.state.getIn(['storedSubsets', table]);
  },
  getDefaultTableQueryFor(table) {
    return this.state.getIn(['defaultTableQueries', table]);
  },
  getStoredTableQueriesFor(table) {
    return this.state.getIn(['storedTableQueries', table]);
  }

});

module.exports = PanoptesStore;
