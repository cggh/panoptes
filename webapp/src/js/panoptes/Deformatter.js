import _indexOf from 'lodash.indexof';

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
    if (isNaN(year)) year = 2000;
    if (isNaN(month)) month = 1;
    if (isNaN(day)) day = 1;
    let dt = new Date(year, month - 1, day, 6, 0, 0)
    let pad = function(n) {
      return n < 10 ? `0${n}` : n;
    };
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
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
