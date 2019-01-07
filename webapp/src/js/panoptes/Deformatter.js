import _indexOf from 'lodash.indexof';

let DateTime2JD = function(date) {
  return date.getTime() / (24.0 * 60 * 60 * 1000) + 2440587.5;
};

const thousandsSeparator = (function(){
  if (typeof Number.prototype.toLocaleString === 'function') {
    const num = 1000;
    const numStr = num.toLocaleString();
    if (numStr.length === 5) {
      return numStr.substr(1, 1);
    }
  }
  return ","; // fall-back
})();

export default function(property, string) {
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
      let value = parseFloat(string.replace(new RegExp(thousandsSeparator, 'g'),''));
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
      let value = parseInt(string.replace(new RegExp(thousandsSeparator, 'g'),''));
      if (isNaN(value))
        return null;
      else
        return value;
    }
  }
  return string;
}
