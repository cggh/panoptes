let JD2DateTime = function(JD) {
  return new Date((JD - 2440587.5) * 24 * 60 * 60 * 1000);
};



module.exports = function(property, value) {
  if (property.isBoolean) {
    return value ? 'True' : 'False';
  }

  if (property.isDate) {
    if ((value == null) || (value == 'None'))
      return '';
    let dt = JD2DateTime(parseFloat(value));
    if (isNaN(dt.getTime()))
      return '2000-01-01';
    let pad = function(n) {
      return n < 10 ? '0' + n : n;
    };
    return dt.getUTCFullYear()
        + '-' + pad(dt.getUTCMonth() + 1)
        + '-' + pad(dt.getUTCDate());
  }

  if (property.isFloat) {
    if ((value == null) || (value == 'None'))
      return '';
    else {
      value = parseFloat(value);
      if (isNaN(value))
        return '';
      else
        return value.toFixed(property.decimDigits).toString();
    }
  }
  return value === undefined ? '' : value.toString();
};
