const Fluxxor = require('fluxxor');
const Immutable = require('immutable');

const Constants = require('../constants/Constants');
const API = Constants.API;


var DataTableViewStore = Fluxxor.createStore({

  initialize() {
    this.state = Immutable.fromJS({
        Table: {
          rows: [
            [1, 2, 3],
            [4, 5, 6]
          ]
        }
      }
    );

    this.bindActions(
      //API.FETCH_TABLE_DATA, this.fetchTableData,
      API.FETCH_TABLE_DATA_SUCCESS, this.fetchTableDataSuccess
      //API.FETCH_TABLE_DATA_FAIL, this.fetchTableDataFail
    );
  },

  fetchTableDataSuccess(payload) {
    let {compId, ...other} = payload;
    this.state = this.state.set(compId, Immutable.fromJS(other));
    this.emit('change');
  },

  getState() {
    return this.state;
  },

  getStateFor(compId) {
    return this.state.get(compId);
  }

});

module.exports = DataTableViewStore;
