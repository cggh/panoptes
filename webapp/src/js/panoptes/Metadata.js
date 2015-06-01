const Network = require('panoptes/Network');
const SQL = require('panoptes/SQL');
const database = "Ag1000G";

function fetchMetadata(flux) {
  let Metadata = {};

  //Check server status
  return Network.getRequestJSON({
    datatype: 'custom',
    respmodule: 'panoptesserver',
    respid: 'serverstatus'
  })
    .then(status => {
      if ('issue' in status)
        throw Error(status.issue);
      Metadata.userId = status.userid;
    })

  //Load manager and schema info
    .then(() => Network.getRequestJSON({
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: 'datasetinfo',
      database: database
    }))
    .then((resp) => {
      resp.needfullreload = true;
      let note = {
        title: "Schema Outdated",
        level: 'error',
        action: {
          label: 'Open admin',
          callback: function () {
            window.open('admin.html','_blank');
          }
        }
      };
      if (resp.needfullreload) {
        note.message = 'A full reload is needed';
        flux.actions.layout.notify(note);
      }
      if (resp.needconfigreload) {
        note.message = 'A config update is needed';
        flux.actions.layout.notify(note);
      }
      Metadata.isManager = resp.manager;
    })

    //Load chromosomes
    .then(() => Network.pageQuery({
      database: database,
      table: 'chromosomes',
      columns: {id: 'ST', len: 'ST'}
    }))
    .then(data => Metadata.chromosomes = data)
    .then(() => Metadata)
}

module.exports = {
  fetchMetadata: fetchMetadata
};
