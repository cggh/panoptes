
let JD2DateTime = function(JD) {
  return new Date((JD - 2440587.5) * 24 * 60 * 60 * 1000);
};

export default function(property, value) {
  if (property.isText) {
    return value === null ? '' : value;
  }

  if (value === null || isNaN(value)) {
    return 'NULL';
  }

  if (property.isBoolean) {
    return value ? 'True' : 'False';
  }

  if (property.isDate) {
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

  if (property.isFloat && value !== '') {

    // Try to convert string representations to float, e.g. "1.01" => 1.01
    // Strings do not have a toFixed() method.
    let parsedValue = parseFloat(value);

    return parsedValue.toFixed(property.decimDigits).toLocaleString();
  }
  return value.toLocaleString();
};
