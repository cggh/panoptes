import tween from 'tween.js';

export default function(val, start, stop, func, outStart, outStop) {
  func = func || tween.Easing.Quadratic.InOut;
  if (outStart == undefined)
    outStart = 0;
  if (outStop == undefined)
    outStop = 1;
  if ((val <= start && start <= stop) || (val >= start && start >= stop))
    return outStart;
  if ((val >= stop && start <= stop) || (val <= stop && start >= stop))
    return outStop;
  return outStart + (func((val - start) / (stop - start)) * (outStop - outStart));
}
