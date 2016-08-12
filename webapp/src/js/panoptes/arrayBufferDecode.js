import DataStream from 'datastream';

function decode_single_array(stream) {
  let dtype = stream.readCString();
  if (dtype === 'S') {
    dtype = '|S';
  }
  const numDim = stream.readUint8();
  const shape = [];
  for (let i = 0; i < numDim; i++)
    shape.push(stream.readUint32());
  const array_len = stream.readUint32();
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
      return;
  }
  let array;
  switch (dtype.substring(1)) {
    case 'u1':
      array = stream.readUint8Array(array_len);
      break;
    case 'u2':
      array = stream.readUint16Array(array_len, endian);
      break;
    case 'u4':
      array = stream.readUint32Array(array_len, endian);
      break;
    case 'i1':
      array = stream.readInt8Array(array_len);
      break;
    case 'i2':
      array = stream.readInt16Array(array_len, endian);
      break;
    case 'i4':
      array = stream.readInt32Array(array_len, endian);
      break;
    case 'f4':
      array = stream.readFloat32Array(array_len, endian);
      break;
    case 'f8':
      array = stream.readFloat64Array(array_len, endian);
      break;
    case 'S':
      array = [];
      for (let i = 0; i < array_len; ++i) {
          array.push(stream.readCString());
      }
      break;
    default:
      throw Error("unsupported dtype");
      return;
  }
  //Firefox is a PITA and won't let us set properties on TypedArrays, so we have to wrap them in an object
  return {
    array: array,
    shape: shape
  };
}

function decode_array_set(stream) {
  const num_arrays = stream.readUint8();
  const result = {};
  for (let i = 0; i < num_arrays; i++) {
    const name = stream.readCString();
    result[name] = decode_single_array(stream);
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
    return decode_single_array(stream);
  }
  else if (typeString == 'AS') {
    return decode_array_set(stream);
  }
  else {
    throw Error('Not array buffer stream');
  }
}