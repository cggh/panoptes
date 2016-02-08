import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import {assertRequired} from 'util/Assert';
import _map from 'lodash/map';
import _transform from 'lodash/transform';
import _reduce from 'lodash/reduce';
import _each from 'lodash/each';

const FETCH_SIZE = 10000;

let findOptimalBlockSize = (start, end, desiredCount, minBlockSize) => {
  let desiredBlockSize = (end - start) / desiredCount;
  let blockSize = Math.max(1, Math.pow(2.0, Math.round(Math.log(desiredBlockSize / minBlockSize) / Math.log(2)))) * minBlockSize;
  //Maximum replicates original behaviour - I'm guessing the summary generation code must stop at this size too?
  blockSize = Math.min(blockSize, 1.0e9);
  return blockSize;
};

let blockStartEnd = (start, end, blockSize) => {
  let blockStart = Math.max(0, Math.floor(start / blockSize) - 1);
  return [blockStart,
    Math.max(blockStart, Math.ceil(end / blockSize) + 1)
  ];
};

let intervalsFromRange = (start, end, size) => {
  let ret = [];
  for (let iStart = Math.floor(start / size) * size;
       iStart < Math.ceil(end / size) * size;
       iStart += size) {
    ret.push(iStart);
  }
  return ret;
};

let SummarisationCache = {
  fetch(options) {
    assertRequired(options, [
      'columns',
      'minBlockSize',
      'chromosome',
      'start',
      'end',
      'targetPointCount'
    ]);
    let {columns, minBlockSize, chromosome, start, end, targetPointCount, cancellation} = options;
    let optimalBlockSize = findOptimalBlockSize(start, end, targetPointCount, minBlockSize);
    let [blockStart, blockEnd] = blockStartEnd(start, end, optimalBlockSize);

    let promises = _map(intervalsFromRange(blockStart, blockEnd, FETCH_SIZE), (sliceStart) => {
      let summaryAPIargs = {
        chromosome: chromosome,
        columns: columns,
        blocksize: optimalBlockSize,
        blockstart: sliceStart,
        blockcount: FETCH_SIZE
      };
      return LRUCache.get(
        'summarisation' + JSON.stringify(summaryAPIargs),
        (cacheCancellation) =>
          API.summaryData({
            cancellation: cacheCancellation,
            ...summaryAPIargs
          }),
        cancellation
      );
    });
    let trimAndConcat = (slices) => {
      if (slices.length > 0) {
        let sliceStart = blockStart - (Math.floor(blockStart / FETCH_SIZE) * FETCH_SIZE);
        let sliceEnd = blockEnd - (Math.floor(blockEnd / FETCH_SIZE) * FETCH_SIZE);
        slices = slices.map((slice, i) =>
          _transform(slice,
            (result, data, name) => {
              if (i == 0 || i == slices.length - 1) {
                result[name] = data.slice(
                  i == 0 ? sliceStart : 0,
                  i == slices.length - 1 ? sliceEnd : undefined
                );
              } else {
                result[name] = data;
              }
            }));
      }
      //Concatenate
      let emptyArrays = _transform(columns, (result, col, name) => result[name] = []);
      let data = _reduce(slices,
        (accum, slice) => {
          _each(slice, (data, name) => Array.prototype.push.apply(accum[name], data));
          return accum;
        },
        emptyArrays
        );
      return {
        columns: data,
        dataStart: blockStart * optimalBlockSize,
        dataStep: optimalBlockSize,
        chromosome: chromosome
      };
    };

    return Promise.all(promises)
      .then(trimAndConcat);
  }

};


module.exports = SummarisationCache;
