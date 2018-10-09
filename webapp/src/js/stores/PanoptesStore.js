import {createStore} from '@demiazz/fluxxor';
import Immutable from 'immutable';

import Constants from '../constants/Constants';
//Not implemeted yet
const API = Constants.API;


let PanoptesStore = createStore({

  initialize(init) {
    this.state = Immutable.fromJS(
      init
    );

    this.bindActions(
      API.FETCH_USER_SUCCESS, this.fetchUserSuccess,
      API.FETCH_USER_FAIL, this.fetchUserFail
    );
  },

  fetchUserSuccess(payload) {
    this.state = this.state.set('user', payload);
    this.emit('change');
  },
  fetchUserFail(payload) {
    console.error('fetchUserFail: %o', payload);
  },

  getState() {
    return this.state;
  },
  getStoredSubsetsFor(table) {
    return this.state.getIn(['storedSubsets', table]) || [];
  }
});

export default PanoptesStore;
