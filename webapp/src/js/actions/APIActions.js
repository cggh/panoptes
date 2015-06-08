const Constants = require('../constants/Constants');
const APICONST = Constants.API;
const LAYOUT = Constants.LAYOUT;
const API = require('panoptes/API');
const Immutable = require('immutable');

const ErrorReport = require('panoptes/ErrorReporter.js');

let APIActions = {
  fetchUser(dataset) {
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
          ErrorReport(this.flux, error.message, () => this.flux.actions.api.fetchUser(dataset));
        }))
    .catch(error => {
      this.dispatch(APICONST.FETCH_USER_FAIL);
      ErrorReport(this.flux, error.message, () => this.flux.actions.api.fetchUser(dataset));
    });
  },
};

module.exports = APIActions;
