const _ = require('lodash');

let Assert = {
  assertRequired(obj, requiredKey) {
    _.each(requiredKey, (key) => {
      if (!(key in obj))
        throw Error(key + 'is a required arg');
    }
    );
  }
};
module.exports = Assert;
