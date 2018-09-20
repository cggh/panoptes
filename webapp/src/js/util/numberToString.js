export default function numberToString(number) {
  // "toLocaleString" would convert "1.0101" to "1.01"
  // "toString" strips off trailing zeros, e.g. "1.00000" becomes "1".
  // Without "toString", a large number will end up with commas in it, e.g. 100,000,000,000,000,000,000
  // With "toString", floats below 0.000001 end up as "1e-7", and numbers above 1000000000000000000000 end up like 1e+21)
  // The inner parseFloat converts anything to either a float or a NaN. Compare with Number() https://stackoverflow.com/questions/12227594/which-is-better-numberx-or-parsefloatx
  // The outer numberToString converts any scientific notation back into a number.

  // Credit: https://stackoverflow.com/questions/1685680/how-to-avoid-scientific-notation-for-large-numbers-in-javascript/46545519#46545519
  // Limitations: numberToString(0.0000002) "0.00000019999999999999998" https://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript

  let num = parseFloat(number);

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
