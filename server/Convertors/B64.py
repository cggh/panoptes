from __future__ import division
# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from builtins import range
from past.utils import old_div
from builtins import object
class B64(object):
    def __init__(self):
        self.encodestr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-"
        #establish the inversion table:
        self.invencode=[]
        for i in range(0,255): self.invencode.append(0)
        for i in range(len(self.encodestr)):
            self.invencode[ord(self.encodestr[i])]=i

    def Int2B64(self, val, maxcnt=-1):
        if val==None:
            return '#'*maxcnt
        rs=''
        cnt=0
        while (val>0) or (cnt==0) or ((maxcnt>0) and (cnt<maxcnt)):
            rs=self.encodestr[val & 63]+rs
            val=val >> 6
            cnt+=1
        return rs

    def B642Int(self, st):
        rs=0
        for ch in st:
            rs=rs*64+self.invencode[ord(ch)]
        return rs

    def BooleanList2B64(self, booleanList):
        byteCount=(len(booleanList)+5)//6
        vl=0
        for flag in booleanList:
            vl = vl << 1
            if flag: vl += 1
        return self.Int2B64(vl,byteCount)

    def B642BooleanList(self, st, offset, valueCount):
        byteCount=(valueCount+5)//6
        maskString=st[offset:offset+byteCount]
        vl = self.B642Int(maskString)
        rs=[]
        for i in range(valueCount):
            rs.append(vl & 1)
            vl = vl >> 1
        return [x for x in reversed(rs)]


class ValueListCoder(object):
    def __init__(self):
        self.b64codec=B64()


    def EncodeIntegers(self, vals):
        result={}
        result['Encoding']="Integer"
        result['Data']=','.join([str(x) for x in vals])
        return result

    def EncodeIntegersByDifferenceB64(self, vals):
        result={}
        MinValX=0
        if vals:
            MinValX=min(vals)
        result['Encoding']="IntegerDiffB64"
        result['Offset']=MinValX
        diffpointsx=[]
        prevxval=MinValX
        for xval in vals:
            if xval<prevxval:
                raise Exception("EncodeIntegersByDifferenceB64: list should be increasing in size")
            diffpointsx.append(int(round(xval-prevxval)))
            prevxval=xval
        result['Data']=','.join([self.b64codec.Int2B64(x) for x in diffpointsx])
        return result

    def EncodeIntegersB64(self, vals):
        result={}
        result['Encoding']="IntegerB64"
        result['Data']=','.join([self.b64codec.Int2B64(int(0.5+x)) for x in vals])
        return result


    def EncodeFloatsByIntB64(self, vals, bytecount):
        result={}
        result['Encoding']="FloatAsIntB64"
        MinVal=0
        MaxVal=1
        nonemptyvals=[float(x) for x in vals if x is not None]
        if (nonemptyvals):
            MinVal=min(nonemptyvals)
            MaxVal=max(nonemptyvals)
            if MaxVal==MinVal: MaxVal=MinVal+1

        CompressedRange=int(64**bytecount-10)
        Offset=1.0*MinVal
        Slope=1.0*(MaxVal-MinVal)/CompressedRange
        if (Slope == 0):
           Slope = 1
        result['Offset']=Offset
        result['Slope']=Slope
        result['ByteCount']=bytecount
#        result['Data']=''.join([self.b64codec.Int2B64(int((vl-Offset)/Slope),bytecount) for vl in vals])
        absentcode='~' * bytecount#this string is used to encode an absent value
        result['Data']=''.join(
            [vl is None and (absentcode) or (self.b64codec.Int2B64(int(old_div((float(vl)-Offset),Slope)),bytecount)) for vl in vals]
        )
        return result


    def EncodeFloatsH(self, vals):
        result={}
        result['Encoding']="FloatAsH"
        result['Data']=','.join(
            [(vl is None and ('~')) or (str(vl)) for vl in vals]
        )
        return result



    def EncodeStrings(self, vals):
        #!!!todo: ensure that all string have nice compatible ascii content
        result={}
        result['Encoding']="String"
        try:
            result['Data']='~'.join([(item or '') for item in vals])
        except TypeError:
            result['Data']='~'.join([(str(item) or '') for item in vals])
        return result

    def EncodeGeneric(self, vals):
        result={}
        result['Encoding']="String"
        result['Data']='~'.join([(str(item or '')) for item in vals])
        return result

    def EncodeByMethod(self, vals, methodid):
        if methodid=='GN':
            return self.EncodeGeneric(vals)
        if methodid=='ST':
            return self.EncodeStrings(vals)
        if methodid=='IN':
            return self.EncodeIntegers(vals)
        if methodid=='IB':
            return self.EncodeIntegersB64(vals)
        if methodid=='ID':
            return self.EncodeIntegersByDifferenceB64(vals)
        if methodid=='F2':
            return self.EncodeFloatsByIntB64(vals,2)
        if methodid=='F3':
            return self.EncodeFloatsByIntB64(vals,3)
        if methodid=='F4':
            return self.EncodeFloatsByIntB64(vals,4)
        if methodid=='FH':
            return self.EncodeFloatsH(vals)
        raise Exception('Invalid column encoding identifier {0}'.format(methodid))
