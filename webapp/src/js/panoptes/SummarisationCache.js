const LRUCache = require('util/LRUCache');
const API = require('panoptes/API');
const Q = require('q');

const FETCH_SIZE = 10000;

let findOptimalBlockSize = (start, end, desiredCount, minBlockSize) => {
  var desiredBlockSize = (end - start) / desiredCount;
  var blockSize = Math.max(1, Math.pow(2.0, Math.round(Math.log(desiredBlockSize / minBlockSize) / Math.log(2)))) * minBlockSize;
  //Maximum replicates original behaviour - I'm guessing the summary generation code must stop at this size too?
  blockSize = Math.min(blockSize, 1.0e9);
  return blockSize;
};

let blockStartEnd = (start, end, blockSize) => {
  let blockStart = Math.max(0, Math.floor(start / blockSize));
  return [blockStart,
    Math.max(blockStart, Math.ceil(end / blockSize))
  ]
};

let intervalsFromRange = (start, end, size) => {
  let ret = [];
  for (let iStart = Math.floor(start / size) * size;
       iStart < Math.ceil(end / size) * size;
       iStart += size) {
    ret.push(iStart)
  }
  return ret;
};

let SummarisationCache = {
  fetch(columns, minBlockSize, chromosome, start, end, targetPointCount, invalidationID) {
    let optimalBlockSize = findOptimalBlockSize(start, end, targetPointCount, minBlockSize);
    let [blockStart, blockEnd] = blockStartEnd(start, end, optimalBlockSize);
    let promises = _.map(intervalsFromRange(blockStart, blockEnd, FETCH_SIZE), (sliceStart) =>
        LRUCache.get('summarisation', [{
            chromosome: chromosome,
            columns: columns,
            blocksize: optimalBlockSize,
            blockstart: sliceStart,
            blockcount: FETCH_SIZE
          }],
          API.summaryData,
          invalidationID
        )
    );
    //We can't just return the promise if the data is ready as this will defer execution till after the next tick.
    let trimAndConcat = (slices) => {
      if (slices.length > 0) {
        let sliceStart = blockStart - (Math.floor(blockStart / FETCH_SIZE) * FETCH_SIZE);
        let sliceEnd = blockEnd-(Math.floor(blockEnd / FETCH_SIZE) * FETCH_SIZE);
        slices = _.map(slices, (slice, i) =>
          _.transform(slice,
            (result, data, name) => {
              if (i == 0 || i == slices.length - 1) {
                result[name] = data.slice(
                  i == 0 ? sliceStart : 0,
                  i == slices.length - 1 ? sliceEnd : undefined
                )
              } else {
                result[name] = data;
              }
            }));
      }
      //Concatenate
      let emptyArrays = _.transform(columns, (result, col, name) => result[name] = []);
      let data = _.reduce(slices,
        (accum, slice) => {
          _.each(slice, (data, name) => Array.prototype.push.apply(accum[name], data));
          return accum;
        },
        emptyArrays
        );
      return {
        columns: data,
        start: blockStart * optimalBlockSize,
        step: optimalBlockSize
      }
    };

    if (_.all(promises, (p) => p.isFulfilled())) {
      return [trimAndConcat(_.map(promises, (p) => p.inspect().value)), null]

    } else {
      return [null, Q.all(promises).then((slices) => trimAndConcat(slices))]
    }
  }

};


module.exports = SummarisationCache;
