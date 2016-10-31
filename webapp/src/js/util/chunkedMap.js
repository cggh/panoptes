export default function chunkedMap(array, fn, maxTimePerChunk, context) {
    context = context || window;
    maxTimePerChunk = maxTimePerChunk || 200;
    var index = 0;

    function now() {
        return new Date().getTime();
    }

    function doChunk() {
        var startTime = now();
        while (index < array.length && (now() - startTime) <= maxTimePerChunk) {
            // callback called with args (value, index, array)
            fn.call(context, array[index], index, array);
            ++index;
        }
        if (index < array.length) {
            // set Timeout for async iteration
            setTimeout(doChunk, 1);
        }
    }
    doChunk();
}
