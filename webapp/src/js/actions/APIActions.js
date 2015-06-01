const Constants = require('../constants/Constants');
const APICONST = Constants.API;
const LAYOUT = Constants.LAYOUT;
const API = require('panoptes/API');

function errorNotify(errText, retryFunc) {
  let note = {
    title: "Error",
    level: 'error',
    message: errText
  };
  if (retry) {
    note.action = {
      label: 'Retry',
      callback: retryFunc
    }
  }
  this.dispatch(LAYOUT.NOTIFY, note);
}

let APIActions = {
  fetchUser() {
    this.dispatch(APICONST.FETCH_USER);
    API.getRequestJSON({
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: 'serverstatus'
    })
      .then(status => {
        if ('issue' in status)
          throw Error(status.issue);
        return status.userid;
      })
      .then(userID => this.dispatch(APICONST.FETCH_USER_SUCCESS, userID))
      .catch(error => {
        this.dispatch(APICONST.FETCH_USER_FAIL);
        errorNotify(error, APIActions.fetchUser);
      });
  }
};

module.exports = APIActions;
