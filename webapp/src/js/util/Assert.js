const _ = require('lodash');

let Assert = {
  assertRequired(obj, required_key) {
    _.each(required_key, key => {
        if (!(key in obj))
          throw Error(key + 'is a required arg');
      }
    )
  }
};
module.exports = Assert;