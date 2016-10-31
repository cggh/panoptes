export default function chunkedMap(bounds, fn, updateFn, chunkSize, maxTimePerChunk, context) {
  const [start, end] = bounds;
  context = context || window;
  maxTimePerChunk = maxTimePerChunk || 200;
  chunkSize = chunkSize || 100;
  var index = start;

  function now() {
    return new Date().getTime();
  }

  function doChunk() {
    var startTime = now();
    let chunkStart = index;
    while (index < end && ((index - chunkStart < chunkSize) || (now() - startTime) <= maxTimePerChunk && (chunkSize = index))) {
      // callback called with args (value, index, array)
      fn.call(context, index);
      ++index;
    }
    updateFn.call(context);
    if (index < end) {
      // set Timeout for async iteration
      setTimeout(doChunk, 1);
    }
  }
  setTimeout(doChunk, 1);
}
