let {PI, exp, log, sin, asin} = Math;
const DEGREE_TO_RADIAN = PI / 180.0;
const RADIAN_TO_DEGREE = 180.0 / PI;

const sinh = (x) => (exp(x) - exp(-x)) / 2.0;
const cosh = (x) => (exp(x) + exp(-x)) / 2.0;
const tanh = (x) => sinh(x) / cosh(x);
const atanh = (x) => log((1 + x) / (1 - x)) / 2;

module.exports = {
  latlngToMercatorXY: ({lat, lng}) => ({
    x: lng / 180.0,
    y: atanh(sin(lat * DEGREE_TO_RADIAN)) / PI
  }),
  mercatorXYtolatlng: ({x, y}) => ({
    lat: asin(tanh(y * PI)) * RADIAN_TO_DEGREE,
    lng: ((x > 0) ? (((x + 1) % 2) - 1) : (((x - 1) % 2) + 1)) * 180
  })
};