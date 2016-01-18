const Fluxxor = require('fluxxor');
const Immutable = require('immutable');

const SQL = require('panoptes/SQL');

const Constants = require('../constants/Constants');
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
    let last = this.state.getIn(['lastQuery', table]);
    return last || SQL.WhereClause.encode(SQL.WhereClause.Trivial());
  },
  getStoredQueriesFor(table) {
    return this.state.getIn(['storedQueries', table]);
  },

  getState() {
    return this.state;
  }
});

module.exports = PanoptesStore;
