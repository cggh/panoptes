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
  },

  getState() {
    return this.state;
  }

});

module.exports = PanoptesStore;
