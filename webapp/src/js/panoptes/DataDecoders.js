// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
 *************************************************************************************************************************************

 Contains codecs that are used to efficiently communicate with the DQXServer counterpart


 *************************************************************************************************************************************
 *************************************************************************************************************************************/

function checkIsNumber(value) {
  if (typeof value != 'number') throw Error('Expected number got' + (typeof value));
}

let DataDecoders = {};

/////////////////////////////////////////////////////////////////////////////////////////
//Basic base64 encoding/decoding
/////////////////////////////////////////////////////////////////////////////////////////

DataDecoders.B64 = function() {
  let that = {};
  that.encodestr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-';
  that.invencode = [];
  for (let i = 0; i < 255; i++) that.invencode.push(0);
  for (let i = 0; i < that.encodestr.length; i++)
    that.invencode[that.encodestr[i].charCodeAt(0)] = i;

  //Converts a 64bit encoded integer to an integer
  that.B642Int = function(st) {
    let rs = 0;
    for (let i = 0; i < st.length; i++)
      rs = (rs << 6) + this.invencode[st.charCodeAt(i)];
    return rs;
  };

  //Converts a 64bit encoded integer to an integer
  that.B642IntFixed = function(st, offset, len) {
    if (st[offset] == '~')
      return null;
    let rs = 0;
    for (let i = 0; i < len; i++)
      rs = (rs << 6) + this.invencode[st.charCodeAt(offset + i)];
    return rs;
  };


  //Converts a set of 64bit encoded integers to float array, applying a linear mapping using slope and offset
  that.arrayB642Float = function(st, bytecount, slope, offset) {
    let vals = [];
    let cnt = st.length / bytecount;
    let ps = 0;
    for (let i = 0; i < cnt; i++) {
      if ((st[ps] == '~') || (st[ps] == '#')) { //coding for absent value
        vals.push(null);
        ps += bytecount;
      } else {
        let rs = 0;
        for (let j = 0; j < bytecount; j++) {
          rs = (rs << 6) + this.invencode[st.charCodeAt(ps)];
          ps++;
        }
        //rs = Math.random()*Math.pow(64,bytecount);//!!!
        vals.push(rs * slope + offset);
      }
    }
    return vals;
  };

  return that;
};

/////////////////////////////////////////////////////////////////////////////////////////
//Decoder for different formats of value lists as provided by the server
/////////////////////////////////////////////////////////////////////////////////////////

DataDecoders.ValueListDecoder = function() {
  let that = {};
  that.b64codec = DataDecoders.B64();
  that.doDecode = function(data) {

    if (data['Encoding'] == 'IntegerDiffB64') {
      if (data['Data'].length == 0) return [];
      let vals = [];
      let offset = data['Offset'];
      let datastrlist = data['Data'].split(',');
      for (let i = 0; i < datastrlist.length; i++) {
        offset += this.b64codec.B642Int(datastrlist[i]);
        vals.push(offset);
      }
      return vals;
    }

    if (data['Encoding'] == 'IntegerB64') {
      if (data['Data'].length == 0) return [];
      let vals = [];
      let datastrlist = data['Data'].split(',');
      for (let i = 0; i < datastrlist.length; i++)
        vals.push(this.b64codec.B642Int(datastrlist[i]));
      return vals;
    }

    if (data['Encoding'] == 'FloatAsIntB64') {
      if (data['Data'].length == 0) return [];
      let offset = data['Offset'];
      let slope = data['Slope'];
      let bytecount = data['ByteCount'];
      let datastr = data['Data'];
      let vals = this.b64codec.arrayB642Float(datastr, bytecount, slope, offset);
      return vals;
    }

    if (data['Encoding'] == 'FloatAsH') {
      if (data['Data'].length == 0) return [];
      let vals = [];
      let datastrlist = data['Data'].split(',');
      for (let i = 0; i < datastrlist.length; i++) {
        if (datastrlist[i] != '~')
          vals.push(parseFloat(datastrlist[i]));
        else
          vals.push(null);
      }
      return vals;
    }

    if (data['Encoding'] == 'Integer') {
      if (data['Data'].length == 0) return [];
      let vals = [];
      let datastrlist = data['Data'].split(',');
      for (let i = 0; i < datastrlist.length; i++) {
        vals.push(parseInt(datastrlist[i]));
      }
      return vals;
    }

    if (data['Encoding'] == 'String') {
      if (data['Data'].length == 0) return [];
      let vals = data['Data'].split('~');
      return vals;
    }
    throw Error('Unknown value list encoding: ' + data['Encoding']);
  };

  return that;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Decoder/encoder factory
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

DataDecoders.Encoder = {};

DataDecoders.Encoder.FixedString = function(info) {
  let that = {};
  checkIsNumber(info.Len);
  that.length = parseFloat(info.Len);
  that.decodeArray = function(datastr) {
    let rs = [];
    let ct = datastr.length / this.length;
    for (let i = 0; i < ct; i++)
      rs.push(datastr.slice(i * this.length, (i + 1) * this.length));
    return rs;

  };
  that.decodeSingle = function(datastr, offset) {
    return datastr.substring(offset, offset + this.length);
  };
  that.getRecordLength = function() {
    return this.length;
  };
  return that;
};

DataDecoders.Encoder.Boolean = function() {
  let that = {};
  that.decodeArray = function(datastr) {
    let rs = [];
    let ct = datastr.length;
    for (let i = 0; i < ct; i++)
      rs.push(datastr[i] == '1');
    return rs;
  };
  that.decodeSingle = function(datastr, offset) {
    return datastr[offset] == '1';
  };
  that.getRecordLength = function() {
    return 1;
  };
  return that;
};

DataDecoders.Encoder.Int2B64 = function(info) {
  let that = {};
  checkIsNumber(info.Len);
  that.length = parseFloat(info.Len);
  let _b64codec = DataDecoders.B64();
  that.decodeSingle = function(datastr, offset) {
    return _b64codec.B642IntFixed(datastr, offset, this.length);
  };
  that.getRecordLength = function() {
    return this.length;
  };
  return that;
};


DataDecoders.Encoder.Float2B64 = function(info) {
  let that = {};
  checkIsNumber(info.Len);
  checkIsNumber(info.Offset);
  checkIsNumber(info.Slope);
  that.offset = parseFloat(info.Offset);
  that.slope = parseFloat(info.Slope);
  that.length = parseFloat(info.Len);
  let _b64codec = DataDecoders.B64();
  that.decodeArray = function(datastr) {
    return _b64codec.arrayB642Float(datastr, this.length, this.slope, this.offset);
  };
  that.decodeSingle = function(datastr, offset) {
    return _b64codec.B642IntFixed(datastr, offset, this.length) * this.slope + this.offset;
  };
  that.getRecordLength = function() {
    return this.length;
  };
  return that;
};

DataDecoders.Encoder.FloatList2B64 = function(info) {
  let that = {};
  checkIsNumber(info.Count);
  checkIsNumber(info.RangeOffset);
  checkIsNumber(info.RangeSlope);
  that.rangeOffset = parseFloat(info.RangeOffset);
  that.rangeSlope = parseFloat(info.RangeSlope);
  that.count = parseInt(info.Count);
  let _b64codec = DataDecoders.B64();
  that.decodeArray = function(datastr) {
    let strlen = datastr.length;
    let reclen = that.count + 4;
    let rs = [];
    for (let offset = 0; offset < strlen; offset += reclen) {
      let minVal = _b64codec.B642IntFixed(datastr, offset + 0, 2) * that.rangeSlope + that.rangeOffset;
      let maxVal = _b64codec.B642IntFixed(datastr, offset + 2, 2) * that.rangeSlope + that.rangeOffset;
      let subrs = [];
      for (let i = 0; i < this.count; i++)
        subrs.push(minVal + _b64codec.B642IntFixed(datastr, offset + 4 + i, 1) / 63.0 * (maxVal - minVal));
      rs.push(subrs);
    }
    return rs;
  };
  that.getRecordLength = function() {
    throw Error('Undefined record length');
  };

  return that;
};


DataDecoders.Encoder.BooleanListB64 = function(info) {
  let that = {};
  checkIsNumber(info.Count);
  that.rangeSlope = parseFloat(info.RangeSlope);
  that.valueCount = parseInt(info.Count);
  that.byteCount = Math.floor((that.valueCount + 5) / 6.0);
  let _b64codec = DataDecoders.B64();
  that.decodeArray = function(datastr) {
    return '-';
  };
  that.decodeSingle = function(datastr, offset) {
    let vl = _b64codec.B642IntFixed(datastr, offset, this.byteCount);
    let rs = [];
    for (let i = 0; i < this.valueCount; i++) {
      rs.unshift(vl & 1);
      vl = vl >> 1;
    }
    return rs;
  };
  that.getRecordLength = function() {
    return this.byteCount;
  };

  return that;
};


DataDecoders.Encoder.MultiCatCount = function(info) {
  let that = {};
  checkIsNumber(info.CatCount);
  checkIsNumber(info.EncoderLen);
  that.catCount = parseInt(info.CatCount);
  that.encoderlen = parseInt(info.EncoderLen);
  let _b64codec = DataDecoders.B64();
  that.decodeArray = function(datastr) {
    let strlen = datastr.length;
    let rs = [];
    for (let offset = 0; offset < strlen;) {
      let subrs = [];
      for (let i = 0; i < that.catCount; i++) {
        subrs.push(_b64codec.B642IntFixed(datastr, offset, that.encoderlen));
        offset += that.encoderlen;
      }
      rs.push(subrs);
    }
    return rs;
  };
  that.decodeSingle = function(datastr, offset) {
    throw 'Not implemented';
  };
  that.getRecordLength = function() {
    return this.byteCount;
  };

  return that;
};


//Factory function that automatically creates a codec based on the properties
DataDecoders.Encoder.Create = function(info) {
  if (info['ID'] == 'Int2B64')
    return DataDecoders.Encoder.Int2B64(info);
  if (info['ID'] == 'Float2B64')
    return DataDecoders.Encoder.Float2B64(info);
  if (info['ID'] == 'FloatList2B64')
    return DataDecoders.Encoder.FloatList2B64(info);
  if (info['ID'] == 'FixedString')
    return DataDecoders.Encoder.FixedString(info);
  if (info['ID'] == 'Boolean')
    return DataDecoders.Encoder.Boolean(info);
  if (info['ID'] == 'BooleanListB64')
    return DataDecoders.Encoder.BooleanListB64(info);
  if (info['ID'] == 'MultiCatCount')
    return DataDecoders.Encoder.MultiCatCount(info);
  throw Error('Invalid encoder id ' + info['ID']);
};


module.exports = DataDecoders;
