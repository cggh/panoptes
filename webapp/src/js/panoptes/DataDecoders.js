// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
 *************************************************************************************************************************************

 Contains codecs that are used to efficiently communicate with the DQXServer counterpart


 *************************************************************************************************************************************
 *************************************************************************************************************************************/

var DataDecoders = {};

/////////////////////////////////////////////////////////////////////////////////////////
//Basic base64 encoding/decoding
/////////////////////////////////////////////////////////////////////////////////////////

DataDecoders.B64 = function () {
  var that = {};
  that.encodestr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-";
  that.invencode = [];
  for (var i = 0; i < 255; i++) that.invencode.push(0);
  for (var i = 0; i < that.encodestr.length; i++)
    that.invencode[that.encodestr[i].charCodeAt(0)] = i;

  //Converts a 64bit encoded integer to an integer
  that.B642Int = function (st) {
    var rs = 0;
    for (var i = 0; i < st.length; i++)
      rs = (rs << 6) + this.invencode[st.charCodeAt(i)]
    return rs;
  };

  //Converts a 64bit encoded integer to an integer
  that.B642IntFixed = function (st, offset, len) {
    if (st[offset] == '~')
      return null;
    rs = 0;
    for (var i = 0; i < len; i++)
      rs = (rs << 6) + this.invencode[st.charCodeAt(offset + i)]
    return rs;
  };


  //Converts a set of 64bit encoded integers to float array, applying a linear mapping using slope and offset
  that.arrayB642Float = function (st, bytecount, slope, offset) {
    var vals = [];
    var cnt = st.length / bytecount;
    var ps = 0;
    for (var i = 0; i < cnt; i++) {
      if ((st[ps] == '~') || (st[ps] == '#')) {//coding for absent value
        vals.push(null);
        ps += bytecount;
      }
      else {
        var rs = 0;
        for (var j = 0; j < bytecount; j++) {
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

DataDecoders.ValueListDecoder = function () {
  var that = {};
  that.b64codec = DataDecoders.B64();
  that.doDecode = function (data) {

    if (data['Encoding'] == 'IntegerDiffB64') {
      if (data['Data'].length == 0) return [];
      var vals = [];
      var offset = data['Offset'];
      var datastrlist = data['Data'].split(',');
      for (var i = 0; i < datastrlist.length; i++) {
        offset += this.b64codec.B642Int(datastrlist[i]);
        vals.push(offset);
      }
      return vals;
    }

    if (data['Encoding'] == 'IntegerB64') {
      if (data['Data'].length == 0) return [];
      var vals = [];
      var datastrlist = data['Data'].split(',');
      for (var i = 0; i < datastrlist.length; i++)
        vals.push(this.b64codec.B642Int(datastrlist[i]));
      return vals;
    }

    if (data['Encoding'] == 'FloatAsIntB64') {
      if (data['Data'].length == 0) return [];
      var offset = data['Offset'];
      var slope = data['Slope'];
      var bytecount = data['ByteCount'];
      var datastr = data['Data'];
      var vals = this.b64codec.arrayB642Float(datastr, bytecount, slope, offset);
      return vals;
    }

    if (data['Encoding'] == 'FloatAsH') {
      if (data['Data'].length == 0) return [];
      var vals = [];
      var datastrlist = data['Data'].split(',');
      for (var i = 0; i < datastrlist.length; i++) {
        if (datastrlist[i] != '~')
          vals.push(parseFloat(datastrlist[i]));
        else
          vals.push(null);
      }
      return vals;
    }

    if (data['Encoding'] == 'Integer') {
      if (data['Data'].length == 0) return [];
      var vals = [];
      var datastrlist = data['Data'].split(',');
      for (var i = 0; i < datastrlist.length; i++) {
        vals.push(parseInt(datastrlist[i]));
      }
      return vals;
    }

    if (data['Encoding'] == 'String') {
      if (data['Data'].length == 0) return [];
      var vals = data['Data'].split('~');
      return vals;
    }
    throw Error("Unknown value list encoding: " + data['Encoding']);
  };

  return that;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Decoder/encoder factory
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

DataDecoders.Encoder = {};

DataDecoders.Encoder.FixedString = function (info) {
  var that = {};
  DQX.checkIsNumber(info.Len);
  that.length = parseFloat(info.Len);
  that.decodeArray = function (datastr) {
    var rs = [];
    var ct = datastr.length / this.length;
    for (var i = 0; i < ct; i++)
      rs.push(datastr[i * this.length, (i + 1) * this.length])
    return rs;
  };
  that.decodeSingle = function (datastr, offset) {
    return datastr.substring(offset, offset + this.length);
  };
  that.getRecordLength = function () {
    return this.length;
  };
  return that;
};

DataDecoders.Encoder.Boolean = function (info) {
  var that = {};
  that.decodeArray = function (datastr) {
    var rs = [];
    var ct = datastr.length;
    for (var i = 0; i < ct; i++)
      rs.push(datastr[i] == '1')
    return rs;
  };
  that.decodeSingle = function (datastr, offset) {
    return datastr[offset] == '1';
  };
  that.getRecordLength = function () {
    return 1;
  };
  return that;
};

DataDecoders.Encoder.Int2B64 = function (info) {
  var that = {};
  DQX.checkIsNumber(info.Len);
  that.length = parseFloat(info.Len);
  var _b64codec = DataDecoders.B64();
  that.decodeSingle = function (datastr, offset) {
    return _b64codec.B642IntFixed(datastr, offset, this.length);
  }
  that.getRecordLength = function () {
    return this.length;
  };
  return that;
};


DataDecoders.Encoder.Float2B64 = function (info) {
  var that = {};
  DQX.checkIsNumber(info.Len);
  DQX.checkIsNumber(info.Offset);
  DQX.checkIsNumber(info.Slope);
  that.offset = parseFloat(info.Offset);
  that.slope = parseFloat(info.Slope);
  that.length = parseFloat(info.Len);
  var _b64codec = DataDecoders.B64();
  that.decodeArray = function (datastr) {
    return _b64codec.arrayB642Float(datastr, this.length, this.slope, this.offset);
  };
  that.decodeSingle = function (datastr, offset) {
    return _b64codec.B642IntFixed(datastr, offset, this.length) * this.slope + this.offset;
  };
  that.getRecordLength = function () {
    return this.length;
  };
  return that;
};

DataDecoders.Encoder.FloatList2B64 = function (info) {
  var that = {};
  DQX.checkIsNumber(info.Count);
  DQX.checkIsNumber(info.RangeOffset);
  DQX.checkIsNumber(info.RangeSlope);
  that.rangeOffset = parseFloat(info.RangeOffset);
  that.rangeSlope = parseFloat(info.RangeSlope);
  that.count = parseInt(info.Count);
  var _b64codec = DataDecoders.B64();
  that.decodeArray = function (datastr) {
    var strlen = datastr.length;
    var reclen = that.count + 4;
    var rs = [];
    for (var offset = 0; offset < strlen; offset += reclen) {
      var minval = _b64codec.B642IntFixed(datastr, offset + 0, 2) * that.rangeSlope + that.rangeOffset;
      var maxval = _b64codec.B642IntFixed(datastr, offset + 2, 2) * that.rangeSlope + that.rangeOffset;
      var subrs = [];
      for (var i = 0; i < this.count; i++)
        subrs.push(minval + _b64codec.B642IntFixed(datastr, offset + 4 + i, 1) / 63.0 * (maxval - minval));
      rs.push(subrs);
    }
    return rs;
  };
  that.getRecordLength = function () {
    throw Error("Undefined record length")
  };

  return that;
};


DataDecoders.Encoder.BooleanListB64 = function (info) {
  var that = {};
  DQX.checkIsNumber(info.Count);
  that.rangeSlope = parseFloat(info.RangeSlope);
  that.valueCount = parseInt(info.Count);
  that.byteCount = Math.floor((that.valueCount + 5) / 6.0)
  var _b64codec = DataDecoders.B64();
  that.decodeArray = function (datastr) {
    return '-';
  };
  that.decodeSingle = function (datastr, offset) {
    var vl = _b64codec.B642IntFixed(datastr, offset, this.byteCount);
    var rs = [];
    for (var i = 0; i < this.valueCount; i++) {
      rs.unshift(vl & 1);
      vl = vl >> 1;
    }
    return rs;
  };
  that.getRecordLength = function () {
    return this.byteCount;
  };

  return that;
};


DataDecoders.Encoder.MultiCatCount = function (info) {
  var that = {};
  DQX.checkIsNumber(info.CatCount);
  DQX.checkIsNumber(info.EncoderLen);
  that.catCount = parseInt(info.CatCount);
  that.encoderlen = parseInt(info.EncoderLen);
  var _b64codec = DataDecoders.B64();
  that.decodeArray = function (datastr) {
    var strlen = datastr.length;
    var reclen = that.catCount * that.encoderlen;
    var rs = [];
    for (var offset = 0; offset < strlen;) {
      var subrs = [];
      for (var i = 0; i < that.catCount; i++) {
        subrs.push(_b64codec.B642IntFixed(datastr, offset, that.encoderlen));
        offset += that.encoderlen;
      }
      rs.push(subrs);
    }
    return rs;
  };
  that.decodeSingle = function (datastr, offset) {
    throw 'Not implemented';
  };
  that.getRecordLength = function () {
    return this.byteCount;
  };

  return that;
};


//Factory function that automatically creates a codec based on the properties
DataDecoders.Encoder.Create = function (info) {
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
  throw Error("Invalid encoder id " + info['ID']);
};


module.exports = DataDecoders;