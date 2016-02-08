import _ from 'lodash';

module.exports = (array, attribute) => {
  let out = {};
  _.forEach(array, (entry) => out[entry[attribute]] = entry);
  return out;
};
