import DataStream from 'datastream';
import utf8 from 'utf8';

function decodeSingleArray(stream) {
  let dtype = stream.readCString();
  if (dtype === 'S') {
    dtype = '|S';
  }
  const numDim = stream.readUint8();
  const shape = [];
  for (let i = 0; i < numDim; i++)
    shape.push(stream.readUint32());
  const arrayLen = stream.readUint32();
  let endian;
  switch (dtype[0]) {
  case '<':
    endian = DataStream.LITTLE_ENDIAN;
    break;
  case '>':
    endian = DataStream.BIG_ENDIAN;
    break;
  case '|':
    endian = DataStream.LITTLE_ENDIAN;
    break;
  default:
    throw Error("dtype doesn't start with endianness");
  }
  let array;
  const type = dtype.substring(1);
  switch (type) {
  case 'u1':
    array = stream.readUint8Array(arrayLen);
    break;
  case 'u2':
    array = stream.readUint16Array(arrayLen, endian);
    break;
  case 'u4':
    array = stream.readUint32Array(arrayLen, endian);
    break;
  case 'i1':
    array = stream.readInt8Array(arrayLen);
    break;
  case 'i2':
    array = stream.readInt16Array(arrayLen, endian);
    break;
  case 'i4':
    array = stream.readInt32Array(arrayLen, endian);
    break;
  case 'f4':
    array = stream.readFloat32Array(arrayLen, endian);
    break;
  case 'f8':
    array = stream.readFloat64Array(arrayLen, endian);
    break;
  case 'S':
    array = [];
    for (let i = 0; i < arrayLen; ++i) {
      array.push(utf8.decode(stream.readCString()))
    }
    break;
  default:
    throw Error(`unsupported dtype:${dtype}`);
  }
  //Firefox is a PITA and won't let us set properties on TypedArrays, so we have to wrap them in an object
  return {
    array,
    shape,
    type
  };
}

function decodeArraySet(stream) {
  const numArrays = stream.readUint8();
  const result = {};
  for (let i = 0; i < numArrays; i++) {
    const name = stream.readCString();
    result[name] = decodeSingleArray(stream);
  }
  return result;
}

export default function decode(buffer) {
  const stream = new DataStream(buffer);
  //The initial metadata is always little endian
  stream.endianness = DataStream.LITTLE_ENDIAN;
  //We now decode the response, see arraybuffer.py:
  const typeString = stream.readString(2);
  if (typeString == 'AB') {
    return decodeSingleArray(stream);
  } else if (typeString == 'AS') {
    return decodeArraySet(stream);
  } else {
    throw Error('Not array buffer stream');
  }
}
