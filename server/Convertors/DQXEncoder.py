from __future__ import print_function
from __future__ import absolute_import
from __future__ import division
# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from past.utils import old_div
from builtins import object
from . import B64

class Encoder(object):
    def __init__(self,info):
        pass
    def perform(self,inp):
        raise Exception('function not implemented')
    def getlength(self):
        raise Exception('function not implemented')
    def getInfo(self):
        raise Exception('function not implemented')

class EncoderInt2B64(Encoder):
    def __init__(self,info):
        Encoder.__init__(self,info)
        self.length=info['Len']
        self.b64=B64.B64()
        self.maxval=64**self.length
    def perform(self,inp):
        if inp==None:
            return '~'*self.length
        if int(inp)>=self.maxval:
            print('WARNING: VALUE INT ENCODER EXCEEDS MAXIMUM {0} > {1}'.format(inp,self.maxval))
            inp=self.maxval-1
        return self.b64.Int2B64(int(inp),self.length)
    def getlength(self):
        return self.length
    def getInfo(self):
        return {'ID':'Int2B64', 'Len':self.length }
    def getDataType(self):
        return "Value"


class EncoderFloat2B64(Encoder):
    def __init__(self,info):
        Encoder.__init__(self,info)
        self.min=info['Min']
        self.max=info['Max']
        self.length=info['Len']
        self.compressedRange=int(64**self.length-10)
        self.mulfac=1.0/(self.max-self.min)*self.compressedRange
        self.slope=1.0/self.mulfac
        self.b64=B64.B64()
    def perform(self,inp):
        if inp==None:
            return '~'*self.length
        intval=int(round((float(inp)-self.min)*self.mulfac))
        if intval<0: intval=0
        if intval>self.compressedRange:
#            print('WARNING: Float out of range: {0} vs {1}'.format(inp,self.max))
            intval=self.compressedRange
        return self.b64.Int2B64(intval,self.length)
    def getlength(self):
        return self.length
    def getInfo(self):
        return {'ID':'Float2B64', 'Offset':self.min, 'Slope':self.slope, 'Len':self.length }
    def getDataType(self):
        return "Value"


def ClipRange(vl,min,max):
    if vl<min: return min
    if vl>max: return max
    return vl

class EncoderFloatList2B64(Encoder):
    def __init__(self,info):
        Encoder.__init__(self,info)
        self.min=info['Min']
        self.max=info['Max']
        self.count=info['Count']
        self.b64=B64.B64()
        self.mulfac=1.0/(self.max-self.min)*4000
    def perform(self,inp):
        if len(inp)!=self.count:
            raise Exception('Inconsistent length for EncoderFloatList2B64')
        rs=''
        minval=min(inp)
        maxval=max(inp)
        if maxval<=minval:maxval=minval+1
        rs+=self.b64.Int2B64(ClipRange(int(0.5+(minval-self.min)*self.mulfac),0,4000),2)
        rs+=self.b64.Int2B64(ClipRange(int(0.5+(maxval-self.min)*self.mulfac),0,4000),2)
        for vl in inp:
            rs+=self.b64.Int2B64(int(0.5+old_div((vl-minval),(maxval-minval)*63)),1)
        return rs
    def getlength(self):
        return self.count+4
    def getInfo(self):
        return {'ID':'FloatList2B64', 'Count':self.count, 'RangeOffset':self.min, 'RangeSlope':(old_div((self.max-self.min)*1.0,4000)) }
    def getDataType(self):
        return "ValueList"



class EncoderFixedString(Encoder):
    def __init__(self,info):
        Encoder.__init__(self,info)
        self.len=info['Len']
    def perform(self,inp):
        if len(inp)!=self.len:
            raise Exception('Inconsistent length for EncoderFixedString')
        return inp
    def getlength(self):
        return self.len
    def getInfo(self):
        return {'ID':'FixedString', 'Len':self.len }
    def getDataType(self):
        return "String"


class EncoderLimitString(Encoder):
    def __init__(self,info):
        Encoder.__init__(self,info)
        self.len=info['Len']
    def perform(self,inp):
        st=inp
        if st == None:
            st = ''
        if len(st)>self.len:
            st=st[:self.len-1]+'>'
        while len(st)<self.len:
            st+=' '
        return st
    def getlength(self):
        return self.len
    def getInfo(self):
        return {'ID':'FixedString', 'Len':self.len }
    def getDataType(self):
        return "String"


class EncoderBoolean(Encoder):
    def __init__(self,info):
        Encoder.__init__(self,info)
    def perform(self,inp):
        if inp:
            return '1'
        else:
            return '0'
    def getlength(self):
        return 1
    def getInfo(self):
        return {'ID':'Boolean' }
    def getDataType(self):
        return "Boolean"

class EncoderMultiCatCount(Encoder):
    def __init__(self, info):
        Encoder.__init__(self, info)
        self.catcount = info['CatCount']
        self.encoderlen = info['EncoderLen']
        self.b64 = B64.B64()
        self.maxval = 64**self.encoderlen

    def perform(self, inp):
        if len(inp) != self.catcount:
            raise Exception('Inconsistent length for EncoderMultiCatCount')
        str = ''
        for val in inp:
            if int(val) >= self.maxval:
                print('WARNING: VALUE INT ENCODER EXCEEDS MAXIMUM {0} > {1}'.format(inp, self.maxval))
                val = self.maxval-1
            str += self.b64.Int2B64(val, self.encoderlen)
        return str

    def getlength(self):
        return self.catcount * self.encoderlen
    def getInfo(self):
        return {'ID':'MultiCatCount', 'CatCount':self.catcount, 'EncoderLen': self.encoderlen }
    def getDataType(self):
        return "MultiCatCount"



def GetEncoder(info):
    if info['ID']=='Int2B64':
        return EncoderInt2B64(info)
    if info['ID']=='Float2B64':
        return EncoderFloat2B64(info)
    if info['ID']=='FloatList2B64':
        return EncoderFloatList2B64(info)
    if info['ID']=='MultiCatCount':
        return EncoderMultiCatCount(info)
    if info['ID']=='FixedString':
        return EncoderFixedString(info)
    if info['ID']=='LimitString':
        return EncoderLimitString(info)
    if info['ID']=='Boolean':
        return EncoderBoolean(info)
    raise Exception('Unknown encoder {0}'.format(info['ID']))
