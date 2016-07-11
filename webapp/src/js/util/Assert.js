let Assert = {
  assertRequired(obj, requiredKeys) {
    requiredKeys.forEach((key) => {
      if (!(key in obj) || obj[key] === undefined)
       throw Error(key + ' is a required arg');
    }
    );
  }
};
module.exports = Assert;
