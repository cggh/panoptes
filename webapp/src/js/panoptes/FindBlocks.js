export default function findBlocks(start, end) {
  let effStart = Math.max(start, 0);
  //We now work out the boundaries of a larger containing area such that some movement can be made without a refetch.
  //Note that the benefit here comes not from network as there is a caching layer there, but from not having to recaclulate the
  //svg path/re-fetch from the cache
  //First find a block size - here we use the first power of 2 that is larger than 3x our width.
  let blockSize = Math.max(1, Math.pow(2.0, Math.ceil(Math.log((end - start) * 3) / Math.log(2))));
  //Then find the first multiple below our start
  let block1Start = Math.floor(effStart / blockSize) * blockSize;
  let block1End = block1Start + blockSize;

  //And and alternative block shifted by half size up or down if we fit in it

  let block2Start = block1Start +
    ((start >= block1Start + blockSize / 2) ? blockSize / 2 : -blockSize / 2);
  let block2End = block2Start + blockSize;

  //We now have two alternative blocks - the second may not cover the region:
  if (block2Start > start || block2End < end || block2Start < 0)
    return [[block1Start, block1End], [null, null]];

  //the first one may be not compatible due to ending early:
  if (block1End < end)
    return [[block2Start, block2End], [null, null]];

  //Otherwise both are valid and return them in order of preference
  if (Math.min(block1End - end, start - block1Start) > Math.min(block2End - end, start - block2Start))
    return [[block1Start, block1End], [block2Start, block2End]];
  else
    return [[block2Start, block2End], [block1Start, block1End]];
}
