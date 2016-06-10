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
      API.STORE_TABLE_QUERY, this.storeTableQuery
    );
  },

  fetchUserSuccess(payload) {
    this.state = this.state.set('user', payload);
    this.emit('change');
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
  },

  storeTableQuery(payload) {
    let {table, query} = payload;

    // TODO: Update the database

    // Put the query at the top of the list of store queries for this table.
    let storedTableQueriesForTable = this.state.getIn(['storedTableQueries', table]);
    let storedTableQueryNumber = storedTableQueriesForTable.size + 1;
    storedTableQueriesForTable = storedTableQueriesForTable.push(Immutable.fromJS({table: table, query: query, name: 'Stored filter ' + storedTableQueryNumber}));
    this.state = this.state.setIn(['storedTableQueries', table], storedTableQueriesForTable);

    // Update the list of stored table queries.
    this.emit('change');

console.log('storeTableQuery getStoredTableQueriesFor: %o', this.state.getIn(['storedTableQueries', table]));
  }

});

module.exports = PanoptesStore;
