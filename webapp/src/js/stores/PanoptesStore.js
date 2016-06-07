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

  getState() {
    return this.state;
  }
});

module.exports = PanoptesStore;
