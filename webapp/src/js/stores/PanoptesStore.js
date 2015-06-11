const Fluxxor = require('fluxxor');
const Immutable = require('immutable');

const Constants = require('../constants/Constants');
const LAYOUT = Constants.LAYOUT;
const API = Constants.API;


var PanoptesStore = Fluxxor.createStore({

  initialize(config) {
    this.state = Immutable.fromJS(
      config
    );

    this.bindActions(
      API.FETCH_USER_SUCCESS, this.fetchUserSuccess
    );
  },

  fetchUserSuccess(payload) {
    this.state = this.state.set('user', payload);
    this.emit('change');
  },

  getState() {
    return this.state;
  },

  getTable(table) {
    return this.state.getIn(['tables', table]);
  }

});

module.exports = PanoptesStore;
