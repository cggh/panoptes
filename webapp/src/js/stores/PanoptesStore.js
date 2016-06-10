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
      API.STORE_TABLE_QUERY_SUCCESS, this.storeTableQuerySuccess
    );
  },

  fetchUserSuccess(payload) {
    this.state = this.state.set('user', payload);
    this.emit('change');
  },
  storeTableQuerySuccess(payload) {
    let {id, table, query, name} = payload;
    let storedTableQueriesForTable = this.state.getIn(['storedTableQueries', table]);
    storedTableQueriesForTable = storedTableQueriesForTable.push(Immutable.fromJS({id: id, table: table, query: query, name: name}));
    this.state = this.state.setIn(['storedTableQueries', table], storedTableQueriesForTable);
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
  }

});

module.exports = PanoptesStore;
