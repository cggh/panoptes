import LRUCache from 'util/LRUCache';
import API from 'panoptes/API';
import {assertRequired} from 'util/Assert';
import _map from 'lodash/map';
import _transform from 'lodash/transform';
import _reduce from 'lodash/reduce';
import _forEach from 'lodash/forEach';
import SQL from 'panoptes/SQL';

const FETCH_SIZE = 10000;

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
      'dataset',
      'table',
      'columns',
      'chromosome',
      'start',
      'end',
      'targetPointCount',
      'chromosomeField',
      'positionField'
    ]);
    let {dataset, table, columns, chromosome, start, end, chromosomeField, positionField, targetPointCount, cancellation} = options;
    let optimalBlockSize = findOptimalBlockSize(start, end, targetPointCount);
    let [blockStart, blockEnd] = blockStartEnd(start, end, optimalBlockSize);
    //Breakup the fetching so we are cache friendly
    columns = columns.concat({expr: ['/', [positionField, optimalBlockSize]], as: 'block'});
    let promises = _map(intervalsFromRange(blockStart, blockEnd, FETCH_SIZE), (sliceStart) => {
      let APIargs = {
        database: dataset,
        table,
        columns: columns,
        query: SQL.WhereClause.encode(SQL.WhereClause.AND([SQL.WhereClause.CompareFixed(chromosomeField, '=', chromosome),
        SQL.WhereClause.CompareFixed(positionField, '>=', sliceStart * optimalBlockSize),
        SQL.WhereClause.CompareFixed(positionField, '<', (sliceStart + FETCH_SIZE) * optimalBlockSize)])),
        groupBy: ['block']
      };
      //select max("AF_1"), min("AF_1"), avg("AF_1"), p/512 as b from variants where "CHROM"='2L' and p between 512*1000 and 512*2001 group by b ;
      return LRUCache.get(
        'summarisation' + JSON.stringify(APIargs),
        (cacheCancellation) =>
          API.query({
            cancellation: cacheCancellation,
            ...APIargs
          }),
        cancellation
      );
    });
    let trimAndConcat = (slices) => {
      debugger;
      if (slices.length > 0) {
        let sliceStart = blockStart - (Math.floor(blockStart / FETCH_SIZE) * FETCH_SIZE);
        let sliceEnd = blockEnd - (Math.floor(blockEnd / FETCH_SIZE) * FETCH_SIZE);
        slices = slices.map((slice, i) =>
          _transform(slice,
            (result, {data, summariser}, name) => {
              if (i == 0 || i == slices.length - 1) {
                result[name] = {
                  data: data.slice(
                    i == 0 ? sliceStart : 0,
                    i == slices.length - 1 ? sliceEnd : undefined
                  ),
                  summariser
                };
              } else {
                result[name] = {data, summariser};
              }
            }));
      }
      //Concatenate
      let emptyArrays = _transform(columns,
        (result, col, name) =>
          result[name] = {
            data: [],
            summariser: slices[0][name].summariser
          }
      );
      let data = _reduce(slices,
        (accum, slice) => {
          _forEach(slice, ({data}, name) => Array.prototype.push.apply(accum[name].data, data));
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
