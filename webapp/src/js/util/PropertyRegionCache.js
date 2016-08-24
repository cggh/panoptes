import {assertRequired} from 'util/Assert';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import SQL from 'panoptes/SQL';
import _keys from 'lodash/keys';
import _map from 'lodash/map';
import _some from 'lodash/some';
import _filter from 'lodash/filter';
import _sumBy from 'lodash/sumBy';
import _each from 'lodash/each';
import _transform from 'lodash/transform';

const seenBlocks = {};

export function findBlock({start, end}) {
  const blockLevel = Math.ceil(Math.log(end - start) / Math.log(2));
  const blockIndex = Math.floor(start / Math.pow(2.0, blockLevel));
  return {
    blockLevel,
    blockIndex,
    needNext: end >= Math.pow(2.0, blockLevel) + Math.pow(2.0, blockLevel) * blockIndex
  };
}

export function regionCacheGet(APIArgs, cacheArgs, cancellation = null) {
  assertRequired(cacheArgs,
    ['method', 'regionField', 'queryField', 'limitField', 'start', 'end', 'blockLimit']);
  const {method, regionField, queryField, limitField, start, end, blockLimit} = cacheArgs;
  if (end < start) {
    throw Error('PropertyRegionCache, end must be >= start');
  }
  const cacheKey = JSON.stringify({method, regionField, queryField, limitField, blockLimit, APIArgs});
  //Find the 2 blocks that encapsulate us
  const {blockLevel, blockIndex, needNext} = findBlock(cacheArgs);
  // const blockSize = Math.pow(2.0, blockLevel);
  // const blockStart = blockSize * blockIndex;
  let blocks = [fetch(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation)
                  .then(ifTooBigFetchSmaller(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation)),
                fetch(APIArgs, cacheArgs, blockLevel, blockIndex + 1, cancellation)
                  .then(ifTooBigFetchSmaller(APIArgs, cacheArgs, blockLevel, blockIndex + 1, cancellation))];
  //If end isn't in the second block then don't bother with it
  if (!needNext) {
    blocks = [blocks[0]];
  }
  //If we haven't seen any fetches with this key, or if we have seen those exact blocks then just fetch those blocks
  let seenBlocksForKey = seenBlocks[cacheKey];
  if (!seenBlocksForKey ||
    (seenBlocksForKey[blockLevel] && seenBlocksForKey[blockLevel][blockIndex] && seenBlocksForKey[blockLevel][blockIndex + 1])) {
    return Promise.all(blocks)
      .then(flatten);
  }
  //So by now we know that we have seen blocks, but not the nearest encompassing block
  //So iterate through the blocks bigger than us that also contain us, if any of those exist then return them
  let index = ~~(blockIndex / 2); //Using "~~" for integer DIV
  let index2 = ~~(blockIndex + 1 / 2);
  for (let level = blockLevel + 1; level < seenBlocksForKey.length; ++level, index = ~~(index / 2), index2 = ~~(index2 / 2)) {
    if (seenBlocksForKey[level] && seenBlocksForKey[level][index] && seenBlocksForKey[level][index2]) {
      return Promise.all((index === index2) ? [fetch(APIArgs, cacheArgs, level, index, cancellation)]
                                            : [fetch(APIArgs, cacheArgs, level, index, cancellation),
                                               fetch(APIArgs, cacheArgs, level, index2, cancellation)])
        .then(ifTooBigFetchDirectly(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation));
    }
  }
  //Oh well, all the cached blocks were smaller or didn't contain us, might as well fetch
  return Promise.all([fetch(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation)
                        .then(ifTooBigFetchSmaller(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation)),
                      fetch(APIArgs, cacheArgs, blockLevel, blockIndex + 1, cancellation)
                        .then(ifTooBigFetchSmaller(APIArgs, cacheArgs, blockLevel, blockIndex + 1, cancellation))])
    .then(flatten);
}

function fetch(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation) {
  let {method, regionField, queryField, limitField, blockLimit, postProcessBlock, isBlockTooBig} = cacheArgs;
  isBlockTooBig = isBlockTooBig || ((block, blockLimit) => !(block[_keys(block)[0]].shape[0] <= blockLimit));
  const cacheKey = JSON.stringify({method, regionField, queryField, limitField, blockLimit, APIArgs});
  const blockSize = Math.pow(2.0, blockLevel);
  const blockStart = blockSize * blockIndex;
  const combinedQuery = SQL.WhereClause.AND([SQL.WhereClause.decode(APIArgs[queryField]),
    SQL.WhereClause.CompareFixed(regionField, '>=', blockStart),
    SQL.WhereClause.CompareFixed(regionField, '<', blockStart + blockSize)]);
  APIArgs = {
    ...APIArgs,
    [queryField]: SQL.WhereClause.encode(combinedQuery),
    [limitField]: blockLimit + 1
  };
  return LRUCache.get(
    'propertyRegionCache' + method + JSON.stringify(APIArgs),
    (cacheCancellation) =>
      API[method]({cancellation: cacheCancellation, ...APIArgs})
        .then((block) => {
          if (isBlockTooBig(block, blockLimit)) {
            return {_blockStart: blockStart, _blockSize: blockSize, _tooBig: true, ...block};
          } else {
            return {_blockStart: blockStart, _blockSize: blockSize, ...(postProcessBlock ? postProcessBlock(block) : block)};
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
    });
}

function ifTooBigFetchSmaller(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation) {
  return (block) => {
    if (block._tooBig) {
      const jump = 3  ;
      const newLevel = blockLevel - jump;
      const wantedBlocks = [];
      const blockMultipler = Math.pow(2, jump);
      for (let block = blockIndex * blockMultipler; block < (blockIndex + 1) * blockMultipler; ++block) {
        wantedBlocks.push(block);
      }
      return Promise.all(_map(wantedBlocks, (index) => fetch(APIArgs, cacheArgs, newLevel, index, cancellation)));
    } else {
      return block;
    }
  };
}

function ifTooBigFetchDirectly(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation) {
  return (blocks) => {
    if (_some(blocks, (block) => block._tooBig)) {
      return Promise.all([fetch(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation)
                            .then(ifTooBigFetchSmaller(APIArgs, cacheArgs, blockLevel, blockIndex, cancellation)),
                          fetch(APIArgs, cacheArgs, blockLevel, blockIndex + 1, cancellation)
                            .then(ifTooBigFetchSmaller(APIArgs, cacheArgs, blockLevel, blockIndex + 1, cancellation))])
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

export function combineBlocks(blocks, property) {
  blocks = _filter(blocks, (block) => !block._tooBig);
  if (blocks.length == 0)
    return [];
  if (blocks[0][property].array.set) {
    let result = new blocks[0][property].array.constructor(
      _sumBy(blocks, (block) => block[property].array.length)
    );
    let arrayPos = 0;
    _each(blocks, (block) => {
      let data = block[property].array;
      result.set(data, arrayPos);
      arrayPos += data.length;
    });
    return result
  } else {
    return _transform(blocks, (sum, block) =>
        Array.prototype.push.apply(sum, block[property] || []),
      []);
  }
}
