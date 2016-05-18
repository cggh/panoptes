import {assertRequired} from 'util/Assert';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import _keys from 'lodash/keys';
import _map from 'lodash/map';
import _some from 'lodash/some';

const seenBlocks = {};

export function findBlock({start, end}) {
  const blockLevel = Math.ceil(Math.log(end - start) / Math.log(2));
  const blockIndex = Math.floor(start / Math.pow(2.0, blockLevel));
  return {
    blockLevel,
    blockIndex,
    needNext: end >= Math.pow(2.0, blockLevel) + Math.pow(2.0, blockLevel) * blockIndex
  }
}

export function regionCacheGet(options, cancellation=null) {
  assertRequired(options,
    ['database', 'table', 'columns', 'query', 'regionField', 'start', 'end', 'blockLimit']);
  const {database, table, columns, query, regionField, start, end, blockLimit} = options;
  if (end < start) {
    throw Error('PropertyRegionCache, end must be >= start');
  }
  const cacheKey = JSON.stringify({database, table, columns, query, regionField, blockLimit});
  //Find the 2 blocks that encapsulate us
  const {blockLevel, blockIndex, needNext} = findBlock(options);
  const blockSize = Math.pow(2.0, blockLevel);
  const blockStart = blockSize * blockIndex;

  let blocks = [fetch(options, blockLevel, blockIndex, cancellation)
                  .then(ifTooBigFetchSmaller(options, blockLevel, blockIndex, cancellation)),
                fetch(options, blockLevel, blockIndex + 1 , cancellation)
                  .then(ifTooBigFetchSmaller(options, blockLevel, blockIndex + 1, cancellation))];
  //If end isn't in the second block then don't bother with it
  if (!needNext) {
    blocks = [blocks[0]];
  }
  //If we haven't seen any fetches with this key, or if we have seen those exact blocks then just fetch those blocks
  var seenBlocksForKey = seenBlocks[cacheKey];
  if (!seenBlocksForKey ||
    (seenBlocksForKey[blockLevel] && seenBlocksForKey[blockLevel][blockIndex] && seenBlocksForKey[blockLevel][blockIndex + 1])) {
    return Promise.all(blocks)
      .then(flatten);
  }
  //So by now we know that we have seen blocks, but not the nearest encompassing block
  //So iterate through the blocks bigger than us that also contain us, if any of those exist then return them
  let index = ~~(blockIndex / 2); //Using "~~" for integer DIV
  let index2 = ~~(blockIndex + 1 / 2);
  for (let level = blockLevel + 1; level < seenBlocksForKey.length; ++level, index = ~~(index / 2), index2 = ~~(index2/2)) {
    if (seenBlocksForKey[level] && seenBlocksForKey[level][index] && seenBlocksForKey[level][index2]) {
      return Promise.all((index === index2) ? [fetch(options, level, index, cancellation)]
                                            : [fetch(options, level, index, cancellation),
                                               fetch(options, level, index2, cancellation)])
        .then(ifTooBigFetchDirectly(options, blockLevel, blockIndex, cancellation));
    }
  }
  //Oh well, all the cached blocks were smaller or didn't contain us, might as well fetch
  return Promise.all([fetch(options, blockLevel, blockIndex, cancellation)
                        .then(ifTooBigFetchSmaller(options, blockLevel, blockIndex, cancellation)),
                      fetch(options, blockLevel, blockIndex + 1, cancellation)
                        .then(ifTooBigFetchSmaller(options, blockLevel, blockIndex + 1, cancellation))])
    .then(flatten);
}

function fetch(options, blockLevel, blockIndex, cancellation) {
  const {database, table, columns, query, regionField, blockLimit} = options;
  const cacheKey = JSON.stringify({database, table, columns, query, regionField, blockLimit});
  const blockSize = Math.pow(2.0, blockLevel);
  const blockStart = blockSize * blockIndex;
  const combinedQuery = SQL.WhereClause.AND([query,
    SQL.WhereClause.CompareFixed(regionField, '>=', blockStart),
    SQL.WhereClause.CompareFixed(regionField, '<', blockStart + blockSize)]);
  let APIargs = {
    database,
    table,
    columns,
    query: SQL.WhereClause.encode(combinedQuery),
    transpose: false,
    stop: blockLimit + 1
  };
  return LRUCache.get(
    'propertyRegionCache' + JSON.stringify(APIargs),
    (cacheCancellation) =>
      API.pageQuery({cancellation: cacheCancellation, ...APIargs})
        .then((block) => {
          if (block[_keys(block)[0]].length <= blockLimit) {
            return {_blockStart: blockStart, _blockSize: blockSize, ...block};
          } else {
            return {_blockStart: blockStart, _blockSize: blockSize, _tooBig: true};
          }
        }),
    cancellation
  )
    .then((data) => {
      //Mark the block as seen so we know it is in the cache (cache could have flushed it, but it is safe to assume not as it will just refetch if so)
      seenBlocks[cacheKey] || (seenBlocks[cacheKey] = []);
      seenBlocks[cacheKey][blockLevel] || (seenBlocks[cacheKey][blockLevel] = []);
      seenBlocks[cacheKey][blockLevel][blockIndex] = true;
      return data;
    })
}

function ifTooBigFetchSmaller(options, blockLevel, blockIndex, cancellation) {
  return (block) => {
    if (block._tooBig) {
      const jump = 3  ;
      const newLevel = blockLevel - jump;
      const wantedBlocks = [];
      const blockMultipler = Math.pow(2, jump);
      for (let block = blockIndex * blockMultipler; block < (blockIndex + 1) * blockMultipler; ++block) {
        wantedBlocks.push(block);
      }
      return Promise.all(_map(wantedBlocks, (index) => fetch(options, newLevel, index, cancellation)));
    } else {
      return block;
    }
  };
}

function ifTooBigFetchDirectly(options, blockLevel, blockIndex, cancellation) {
  return (blocks) => {
    if (_some(blocks, (block) => block._tooBig)) {
      return Promise.all([fetch(options, blockLevel, blockIndex, cancellation)
                            .then(ifTooBigFetchSmaller(options, blockLevel, blockIndex, cancellation)),
                          fetch(options, blockLevel, blockIndex + 1 , cancellation)
                            .then(ifTooBigFetchSmaller(options, blockLevel, blockIndex + 1, cancellation))])
        .then(flatten);
    } else {
      return blocks;
    }
  };
}

function flatten(data) {
  const flattened = [];
  data.forEach((block) => {
    if (Array.isArray(block)) {
      Array.prototype.push.apply(flattened, block);
    } else {
      flattened.push(block);
    }
  });
  return flattened;
}
