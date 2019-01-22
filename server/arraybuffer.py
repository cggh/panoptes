# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import numpy as np
import struct
from operator import mul
from functools import reduce

NATIVE_ENDIAN = '<' if (np.dtype("<i").byteorder == '=') else '>'

def _strict_dtype_string(dtype):
    if dtype.str[1] == 'S' or dtype.str[1] == 'U':
        return b'S'
    if not dtype.isbuiltin:
        raise Exception("Only scalar builtin dtypes (ie not structured with fields or user-defined) or strings currently supported")
#Old method commented out as length is platform dependant
#	byte_order = dtype.byteorder
#	if byte_order == '=':
#		byte_order = NATIVE_ENDIAN
#	return byte_order + dtype.char
	#New method gives explicit num bytes and endianness
    return bytes(dtype.str, 'utf-8')

#Convert a string array to a chain of null terminated strings
def pack_string_array(array):
    result = b''
    if len(array) > 0:
        for string in array.flatten().tolist():
            result += string
            result += b'\0'
    return result

def _encode_numpy_array(array):
    dtype =_strict_dtype_string(array.dtype)
    yield dtype
    yield b'\0'
    yield struct.pack('<B', len(array.shape))
    for dim in array.shape:
        yield struct.pack('<L', dim)
    if dtype == b'S':
        data = pack_string_array(array)
    else:
        data = array.tobytes('C')
    yield struct.pack('<L', reduce(mul,array.shape))
    yield data

def encode_array(array, dtype=None):
    """Encode an array for a JS arraybuffer

    array can be any iterable or a numpy array. If it is not a numpy array it will be converted to one
    with the specifed dtype.

    Returns a generator which yields bytes in the format:

    - First two bytes are 'AB'
    - A /0 terminated cstyle string which is a valid numpy dtype, but which always includes the
      endianness as first char. '<' little-endian, '>' big-endian, '|'not applicable.
    - 1-byte unsigned little endian number of dimensions = D
    - D x 4-byte unsigned little endians dimension sizes
    - 4-byte unsigned little endian array length (equal to the product of dimension sizes)
    - The buffer itself.

    """

    try:
        dtype = dtype or array.dtype
    except AttributeError:
        raise Exception("Non-numpy array passed, but with no numpy dtype to convert to")
    dtype = np.dtype(dtype)
    yield b'AB'
    yield _encode_numpy_array(np.asarray(array, dtype))

def encode_array_set(array_set):
    """Encode a set of named arrays for a set of JS arraybuffer

    array_set is an iterable of name, numpy_array tuples.

    Returns a generator which yields bytes in the format:

    - First two bytes are 'AS'
    - 1-byte unsigned little endian number of arrays
    Then for each array:
        - A /0 terminated cstyle string which contains the name of the array
        - A /0 terminated cstyle string which is a valid numpy dtype, but which always includes the
          endianness as first char. '<' little-endian, '>' big-endian, '|'not applicable.
        - 1-byte unsigned little endian number of dimensions = D
        - D x 4-byte unsigned little endians dimension sizes
        - 4-byte unsigned little endian array length (equal to the product of dimension sizes)
        - The buffer itself.

    """
    array_set = list(array_set)
    yield b'AS'
    yield struct.pack('<B', len(array_set))
    for name, array in array_set:
        yield bytes(name, 'utf-8')
        yield b'\0'
        for chunk in _encode_numpy_array(array):
            yield chunk

	
		
