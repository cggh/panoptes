import Constants from '../constants/Constants';
const APICONST = Constants.API;
import API from 'panoptes/API';

import ErrorReport from 'panoptes/ErrorReporter.js';
import {assertRequired} from 'util/Assert';

let APIActions = {
  fetchUser(dataset) {
    let userID = null;
    this.dispatch(APICONST.FETCH_USER);
    API.requestJSON({
      params: {
        datatype: 'serverstatus'
      }
    })
      .then((status) => {
        if ('issue' in status)
          throw Error(status.issue);
        userID = status.userid;
      })
      .then(API.requestJSON({
        params: {
          datatype: 'datasetinfo',
          database: dataset
        }
      })
        .then((resp) => {
          let note = {
            title: 'Schema Outdated',
            level: 'error',
            autoDismiss: 0,
            action: {
              label: 'Open admin',
              callback: function() {
                window.open('admin.html', '_blank'); // FIXME: Cannot GET /admin.html
              }
            }
          };
          if (resp.needfullreload) {
            note.message = 'A full reload is needed';
            this.flux.actions.session.notify(note);
          }
          if (resp.needconfigreload) {
            note.message = 'A config update is needed';
            this.flux.actions.session.notify(note);
          }
          this.dispatch(APICONST.FETCH_USER_SUCCESS, {
            id: userID,
            isManager: resp.manager
          });
        })
        .catch((error) => {
          this.dispatch(APICONST.FETCH_USER_FAIL);
          ErrorReport(this.flux, error.message, () => this.flux.actions.api.fetchUser(dataset));
        }))
      .catch((error) => {
        this.dispatch(APICONST.FETCH_USER_FAIL);
        ErrorReport(this.flux, error.message, () => this.flux.actions.api.fetchUser(dataset));
      });
  },

  //Action is replace, merge or delete
  modifyConfig(options) {
    assertRequired(options, ['dataset', 'path']);
    let defaults = {
      action: 'replace',
      content: null
    };
    let {dataset, path, action, content} = {...defaults, ...options};
    this.dispatch(APICONST.MODIFY_CONFIG);
    API.modifyConfig(
      {
        dataset,
        path,
        action,
        content
      }
    )
    .then((resp) => {
      this.dispatch(
        APICONST.MODIFY_CONFIG_SUCCESS,
        {
          newConfig: resp
        }
      );
    })
    .catch((error) => {
      this.dispatch(APICONST.MODIFY_CONFIG_FAIL);
      ErrorReport(this.flux, error.message, () => this.flux.actions.api.modifyConfig(options));
    });
  }

};

export default APIActions;
