const Constants = require('../constants/Constants');
const APICONST = Constants.API;
const LAYOUT = Constants.LAYOUT;
const API = require('panoptes/API');

function errorNotify(err, retryFunc) {
  let note = {
    title: "Error",
    level: 'error',
    message: err.message,
    autoDismiss: 0,
    action: {
          label: 'Retry',
          callback: retryFunc
        }
  };
  if (retryFunc) {
    note.action = {
      label: 'Retry',
      callback: retryFunc
    }
  }
  this.flux.actions.layout.notify(note);
}

let APIActions = {
  fetchUser(dataset) {
    console.log('fetch');
    let userID = null;
    this.dispatch(APICONST.FETCH_USER);
    API.getRequestJSON({
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: 'serverstatus'
    })
      .then(status => {
        if ('issue' in status)
          throw Error(status.issue);
        userID = status.userid;
      })
      .then(API.getRequestJSON({
        datatype: 'custom',
        respmodule: 'panoptesserver',
        respid: 'datasetinfo',
        database: dataset
      })
        .then((resp) => {
          let note = {
            title: "Schema Outdated",
            level: 'error',
            autoDismiss: 0,
            action: {
              label: 'Open admin',
              callback: function () {
                window.open('admin.html', '_blank');
              }
            }
          };
          if (resp.needfullreload) {
            note.message = 'A full reload is needed';
            this.flux.actions.layout.notify(note);
          }
          if (resp.needconfigreload) {
            note.message = 'A config update is needed';
            this.flux.actions.layout.notify(note);
          }
          this.dispatch(APICONST.FETCH_USER_SUCCESS, {
            id: userID,
            isManager: resp.manager
          })
        })
        .catch(error => {
          this.dispatch(APICONST.FETCH_USER_FAIL);
          errorNotify.call(this, error, () => this.flux.actions.api.fetchUser(dataset));
        }))
    .catch(error => {
      this.dispatch(APICONST.FETCH_USER_FAIL);
      errorNotify.call(this, error, () => this.flux.actions.api.fetchUser(dataset));
    });
  },

  fetchTableData(compId, query) {
    this.dispatch(APICONST.FETCH_TABLE_DATA, {
      compId: compId,
      query: query
    });
    this.dispatch(APICONST.FETCH_TABLE_DATA_SUCCESS, {
      compId: compId,
      query: query,
      rows: [[7,8,9], [20,45,23]]
    });
  }


};

module.exports = APIActions;
