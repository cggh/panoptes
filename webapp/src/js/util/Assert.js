let Assert = {
  assertRequired(obj, requiredKey) {
    requiredKey.forEach((key) => {
      if (!(key in obj))
        throw Error(key + ' is a required arg');
    }
    );
  }
};
module.exports = Assert;
