
let JD2DateTime = function(JD) {
  return new Date((JD - 2440587.5) * 24 * 60 * 60 * 1000);
};

export default function(property, value, nullReplacement = 'NULL', nanReplacement = 'NULL') {

  if (property.isText) {
    return value === null ? '' : value;
  }

  if (value === null) {
    return nullReplacement;
  }

  if (isNaN(value)) {
    return nanReplacement;
  }

  if (property.isBoolean) {
    return value ? 'True' : 'False';
  }

  if (property.isDate) {
    let dt = JD2DateTime(parseFloat(value));
    if (isNaN(dt.getTime()))
      return '2000-01-01';
    let pad = function(n) {
      return n < 10 ? `0${n}` : n;
    };
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }

  if (property.isFloat && value !== '') {

    // Try to convert string representations to float, e.g. "1.01" => 1.01
    // Strings do not have a toFixed() method.
    // Then fix to property.decimDigits.
    // Then convert to LocaleString.
    return parseFloat(value).toFixed(property.decimDigits).toLocaleString();

    // NB: assuming isFloat never represent years, e.g. 2016
  }

  // Convert to LocaleString if numeric and not a year, e.g. 2016
  if (!isNaN(value) && value > 999 && value <= 9999) {
    // Preserve years, e.g. 2016
    return value;
  }

  return value.toLocaleString();
}
