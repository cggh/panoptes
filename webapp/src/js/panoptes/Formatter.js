
let JD2DateTime = function(JD) {
  return new Date((JD - 2440587.5) * 24 * 60 * 60 * 1000);
};

export default function(property, value, nullReplacement = 'NULL', nanReplacement = 'NULL') {
  return toDataType('property', value, nullReplacement, nanReplacement, property.decimDigits, property);
}

function toDataType(dataType, value, nullReplacement = 'NULL', nanReplacement = 'NULL', decimalDigits, property) {

  if (dataType === 'text' || (dataType === 'property' && property.isText)) {
    return value === null ? '' : value;
  }

  if (value === null) {
    return nullReplacement;
  }

  if (isNaN(value)) {
    return nanReplacement;
  }

  if (dataType === 'boolean-string' || (dataType === 'property' && property.isBoolean)) {
    return value ? 'True' : 'False';
  }

  if (dataType === 'date-string' || (dataType === 'property' && property.isDate)) {
    let dt = JD2DateTime(parseFloat(value));
    if (isNaN(dt.getTime()))
      return '2000-01-01';
    let pad = function(n) {
      return n < 10 ? `0${n}` : n;
    };
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }

  // FIXME: An isFloat property with decimDigits should probably be called an isDecimal, rather than an isFloat
  if ((dataType === 'decimal-string' || (dataType === 'property' && property.isFloat && (decimalDigits !== undefined || property.decimDigits !== undefined))) && value !== '') {

    decimalDigits = decimalDigits || property.decimDigits;

    // Try to convert string representations to float, e.g. "1.01" => 1.01
    // Strings do not have a toFixed() method.
    // Then fix to property.decimDigits.
    // Then convert to LocaleString.
    return parseFloat(value).toFixed(decimalDigits).toLocaleString();

    // NB: assuming isFloat never represent years, e.g. 2016
  }

  if ((dataType === 'float-string' || (dataType === 'property' && property.isFloat && (decimalDigits === undefined && property.decimDigits === undefined))) && value !== '') {
    return numberToString(value);
  }

  if (dataType === 'float-string-with-limits' && value !== '') {
    let valueAsFloatString = numberToString(value);

    // FIXME: server/DQXDbTools.py works on strings (see the ToSafeIdentifier function), which causes string-to-decimal conversion issues in monet, e.g.
    // sql>SELECT count(*) AS "TotalRecordCount" FROM "pf_samples" WHERE ("year" < '1000000000000000000' * "year" + '0.02');
    // Decimal (1000000000000000000) doesn't have format (18.0)
    // The exception
    // throw(SQL, STRING(TYPE), "decimal (%s) doesn't have format (%d.%d)", *val, *d, *sc);
    // originates from https://dev.monetdb.org/hg/MonetDB/file/8f10a8b13e77/sql/backends/monet5/sql_round_impl.h
    // That particular problem (string-to-decimal limitation) could be avoided by not using strings, e.g.
    // sql>SELECT count(*) AS "TotalRecordCount" FROM "pf_samples" WHERE ("year" < 1000000000000000000 * "year" + 0.02);
    // (gives no errors)
    // But then there is another problem to avoid (to support big numbers):
    // sql>SELECT count(*) AS "TotalRecordCount" FROM "pf_samples" WHERE ("year" < 1000000000000000000 * "year" + 1000000000000000000);
    // overflow in calculation 1000000000000000000*2014.

    const MAX_INTEGER_PART_DIGITS = 8;
    const MAX_DECIMAL_PART_DIGITS = 12;
    const BIGGEST_SUPPORTED_NUMBER_AS_FLOAT_STRING = '99999999.999999999999';

    const integerPartDigitsCount = valueAsFloatString.split('.')[0] !== undefined ? valueAsFloatString.split('.')[0].length : 0;
    const digitalPartDigitsCount = valueAsFloatString.split('.')[1] !== undefined ? valueAsFloatString.split('.')[1].length : 0;

    if (digitalPartDigitsCount > MAX_DECIMAL_PART_DIGITS) {
      console.warn('valueAsFloatString', valueAsFloatString, 'exceeded MAX_DECIMAL_PART_DIGITS', MAX_DECIMAL_PART_DIGITS, 'with', digitalPartDigitsCount);
      // NB: Need to cast to float, because it is a string and strings don't have toFixed()
      valueAsFloatString = parseFloat(valueAsFloatString).toFixed(MAX_DECIMAL_PART_DIGITS);
    }

    if (integerPartDigitsCount > MAX_INTEGER_PART_DIGITS) {
      console.warn('valueAsFloatString', valueAsFloatString, 'exceeded MAX_INTEGER_PART_DIGITS', MAX_INTEGER_PART_DIGITS, 'with', integerPartDigitsCount);
      valueAsFloatString = BIGGEST_SUPPORTED_NUMBER_AS_FLOAT_STRING;
    }

    return valueAsFloatString;

  }

  // Convert to LocaleString if numeric and not a year, e.g. 2016
  if (!isNaN(value) && value > 999 && value <= 9999) {
    // Preserve years, e.g. 2016
    return value;
  }

  return value.toLocaleString();
}

function numberToString(number) {
  // "parseFloat(number).toLocaleString()" would convert "1.0101" to "1.01", which is bad, and "100000" to "100,000", which isNaN, which is also bad
  // "parseFloat(number).toString()" strips off trailing zeros, e.g. "1.00000" becomes "1", which is good
  // With "parseFloat(number).toString()", numbers below 0.000001 end up as "1e-7", and numbers above 1000000000000000000000 end up like 1e+2, which is bad

  // "parseFloat(number)" has some undesirable behaviour, e.g.
  // parseFloat(0.0000002) gives "0.00000019999999999999998"
  // parseFloat(99999999999999999) gives 100000000000000000
  // See https://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript

  // Convert anything (string or number) to either a float or a NaN.
  // Compare with Number() https://stackoverflow.com/questions/12227594/which-is-better-numberx-or-parsefloatx
  let num = parseFloat(number);

  // Convert any scientific notation back into a number.
  // Credit: https://stackoverflow.com/questions/1685680/how-to-avoid-scientific-notation-for-large-numbers-in-javascript

  let numStr = String(num);
  if (Math.abs(num) < 1.0) {
    let e = parseInt(num.toString().split('e-')[1]);
    if (e) {
      let negative = num < 0;
      if (negative) num *= -1;
      num *= Math.pow(10, e - 1);
      numStr = '0.' + (new Array(e)).join('0') + num.toString().substring(2);
      if (negative) numStr = '-' + numStr;
    }
  } else {
    let e = parseInt(num.toString().split('+')[1]);
    if (e > 20) {
      e -= 20;
      num /= Math.pow(10, e);
      numStr = num.toString() + (new Array(e + 1)).join('0');
    }
  }

  return numStr;
}


export {toDataType, numberToString};
