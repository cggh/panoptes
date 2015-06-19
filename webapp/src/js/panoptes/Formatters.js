JD2DateTime = function(JD) {
  return new Date((JD-2440587.5)*24*60*60*1000);
};

/**
 * @return {number}
 */
DateTime2JD = function(date) {
  return date.getTime()/(24.0*60*60*1000) + 2440587.5;
};


module.exports = {
  formatValue(property, value) {
    if (property.isBoolean) {
      if (value == 'Yes') return vl;
      return parseInt(vl) ? 'Yes' : 'No';
    }

    if (property.isDate) {
      if ((vl == null) || (vl == 'None'))
        return '';
      var dt = JD2DateTime(parseFloat(vl));
      if (isNaN(dt.getTime()))
        return "2000-01-01";
      var pad = function (n) {
        return n < 10 ? '0' + n : n
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
          return value.toFixed(digits);
      }
    }
    return value;
  }
};
