function memoize(fn) {
  let cache = {};
  return function (arg) {
    if (cache[arg] !== undefined) {
      return cache[arg];
    }
    var result = fn(arg).bind(this);
    cache[arg] = result;
    return result;
  };
}

module.exports = memoize;
