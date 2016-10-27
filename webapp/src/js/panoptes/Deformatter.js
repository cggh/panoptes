import _indexOf from 'lodash/indexOf';

let DateTime2JD = function(date) {
  return date.getTime() / (24.0 * 60 * 60 * 1000) + 2440587.5;
};


module.exports = function(property, string) {
  if (property.isBoolean) {
    return string === 'NULL' ? null : _indexOf(['Yes', 'yes', '1', 'true', 'True'], string) !== -1;
  }

  if (property.isDate) {
    let year = parseInt(string.substring(0, 4));
    let month = parseInt(string.substring(5, 7));
    let day = parseInt(string.substring(8, 10));
    if (isNaN(year) && isNaN(month) && isNaN(day)) {
      return null;
    }
    if (isNaN(year)) year = 2000;
    if (isNaN(month)) month = 1;
    if (isNaN(day)) day = 1;
    return DateTime2JD(new Date(year, month - 1, day, 6, 0, 0));
  }

  if (property.isFloat) {
    if ((string == 'NULL'))
      return null;
    else {
      let value = parseFloat(string);
      if (isNaN(value))
        return null;
      else
        return value;
    }
  }
  if (property.isInt) {
    if ((string == 'NULL'))
      return null;
    else {
      let value = parseInt(string);
      if (isNaN(value))
        return null;
      else
        return value;
    }
  }
  return string;
};
