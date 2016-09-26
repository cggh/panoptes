from collections import namedtuple
import math

_keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~-$"
_baseReverseDic = {}


def _getBaseValue(alphabet, character):
    try:
        _baseReverseDic[alphabet]
    except KeyError:
        _baseReverseDic[alphabet] = {}
        for i in xrange(len(alphabet)):
            _baseReverseDic[alphabet][alphabet[i]] = i
    return _baseReverseDic[alphabet][character]

def decompressFromEncodedURIComponent(input):
    if input is None:
        return ""
    if input == "":
        return ""
    return _decompress(len(input), 32, lambda index: _getBaseValue(_keyStrUriSafe, input[index]))

def decompress(compressed):
    if compressed is None:
        return ""
    if compressed == "":
        return ""
    return _decompress(compressed.length, 32768, lambda index: compressed[index])

def _decompress(length, resetValue, getNextValue):
    dictionary = [False]*256*256
    enlargeIn = 4
    dictSize = 4
    numBits = 3
    entry = ""
    result = ""

    class Data:
        pass
    data = Data()
    data.val = getNextValue(0)
    data.position = resetValue
    data.index = 1

    for i in range(3):
        dictionary[i] = i

    bits = 0
    maxpower = math.pow(2, 2)
    power = 1
    while power != maxpower:
        resb = data.val & data.position
        data.position >>= 1
        if data.position == 0:
            data.position = resetValue
            data.val = getNextValue(data.index)
            data.index += 1
        bits |= (1 if resb > 0 else 0) * power
        power <<= 1

    next = bits
    if next == 0:
        bits = 0
        maxpower = math.pow(2, 8)
        power = 1
        while power != maxpower:
            resb = data.val & data.position
            data.position >>= 1
            if data.position == 0:
                data.position = resetValue
                data.val = getNextValue(data.index)
                data.index += 1

            bits |= (1 if resb > 0 else 0) * power
            power <<= 1
        c = unichr(bits)
    elif next == 1:
        bits = 0
        maxpower = math.pow(2, 16)
        power = 1
        while power != maxpower:
            resb = data.val & data.position
            data.position >>= 1
            if data.position == 0:
                data.position = resetValue
                data.val = getNextValue(data.index)
                data.index += 1

            bits |= (1 if resb > 0 else 0) * power
            power <<= 1
        c = unichr(bits)
    elif next == 2:
        return ""
    dictionary[3] = c
    w = result = c
    while True:
        if data.index > length:
          return ""
        bits = 0
        maxpower = math.pow(2, numBits)
        power = 1
        while power != maxpower:
            resb = data.val & data.position
            data.position >>= 1
            if data.position == 0:
                data.position = resetValue
                data.val = getNextValue(data.index)
                data.index += 1
            bits |= (1 if resb > 0 else 0) * power
            power <<= 1
        c = bits
        if c == 0:
            bits = 0
            maxpower = math.pow(2, 8)
            power = 1
            while power != maxpower:
                resb = data.val & data.position
                data.position >>= 1
                if data.position == 0:
                    data.position = resetValue
                    data.val = getNextValue(data.index)
                    data.index += 1
                bits |= (1 if resb > 0 else 0) * power
                power <<= 1

            dictionary[dictSize] = unichr(bits)
            dictSize += 1
            c = dictSize-1
            enlargeIn -= 1
        elif c == 1:
            bits = 0
            maxpower = math.pow(2, 16)
            power = 1
            while power != maxpower:
                resb = data.val & data.position
                data.position >>= 1
                if data.position == 0:
                    data.position = resetValue
                    data.val = getNextValue(data.index)
                    data.index += 1
                bits |= (1 if resb > 0 else 0) * power
                power <<= 1
            dictionary[dictSize] = unichr(bits)
            dictSize += 1
            c = dictSize-1
            enlargeIn -= 1
        elif c == 2:
            return result
        if enlargeIn == 0:
            enlargeIn = math.pow(2, numBits)
            numBits += 1

        if dictionary[c]:
            entry = dictionary[c]
        elif c == dictSize:
            entry = w + w[0]
        else:
          return None

        result += entry

        # Add w+entry[0] to the dictionary.
        dictionary[dictSize] = w + entry[0]
        dictSize += 1
        enlargeIn -= 1
        w = entry
        if enlargeIn == 0:
          enlargeIn = math.pow(2, numBits)
          numBits += 1
