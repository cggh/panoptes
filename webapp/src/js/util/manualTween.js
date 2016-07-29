import tween from 'tween';

export default function (val, start, stop, func, out_start, out_stop) {
  func = func || tween.Easing.Quadratic.InOut;
  if (out_start == undefined)
    out_start = 0;
  if (out_stop == undefined)
    out_stop = 1;
  if ((val <= start && start <= stop) || (val >= start && start >= stop))
    return out_start;
  if ((val >= stop && start <= stop) || (val <= stop && start >= stop))
    return out_stop;
  return out_start+(func((val-start) / (stop-start)) * (out_stop - out_start))
};
