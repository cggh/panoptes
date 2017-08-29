import API from 'panoptes/API';

let fetchInitialConfig = function(dataset) {
  let isManager = false;
  let userId = 'anonymous';
  return API.requestJSON({
    params: {
      datatype: 'datasetinfo',
      database: dataset
    }
  })
    .then((resp) => {
      if (resp.needfullreload)
        console.log('Schema full reload');
      if (resp.needconfigreload)
        console.log('Schema config reload');
      isManager = resp.manager; //eslint-disable-line no-undef
      userId = resp.userid; //eslint-disable-line no-undef
    })
    .then(() => API.requestJSON({
      params: {
        datatype: 'getconfig',
        dataset
      }
    }))
    .then((resp) => ({dataset, user: {isManager, id: userId}, ...resp.config}));
};

export default fetchInitialConfig;
