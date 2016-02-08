module.exports = (array, attribute) => {
  let out = {};
  array.forEach((entry) => out[entry[attribute]] = entry);
  return out;
};
