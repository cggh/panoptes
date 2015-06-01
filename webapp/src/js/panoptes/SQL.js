const _ = require('lodash');
const Base64 = require('panoptes/Base64');

var SQL = {};


//////////////////////////////////////////////////////////////////////////////////////
// Encapsulates information about an SQL table column
//////////////////////////////////////////////////////////////////////////////////////

SQL.DataTypes = ['String', 'Float', 'Integer', 'MultiChoiceInt'];

SQL.TableColInfo = function (iID, iname, idatatype, ichoicelist) {
  var that = {};
  that.ID = iID;
  that.name = iname;
  that.datatype = idatatype;
  that.choicelist = ichoicelist;

  //Converts a column content value to a display string
  that.content2Display = function (vl) {
    return vl.toString();
  };

  //Converts a display string to a column content value
  that.display2Content = function (str) {
    return str;
  };

  //returns true if this column is of numerical type
  that.isNumerical = function () {
    return (this.datatype == "Float") || (this.datatype == "Integer");
  };

  //returns true of this column contains multiple choice values
  that.isMultipleCoice = function () {
    return (this.datatype == "MultiChoiceInt") || ( this.choicelist && (this.choicelist.length > 0) );
  };
  return that;
};


//////////////////////////////////////////////////////////////////////////////////////
// A set of component classes that can be used to build an sql single table where clause
// and encode it to an url-friendly string
//////////////////////////////////////////////////////////////////////////////////////

SQL.WhereClause = {};

SQL.WhereClause.whcClassGenerator = {};

//A list of all comparison operators that act on a field
SQL.WhereClause._fieldComparisonOperators = [
  {
    ID: '=', name: 'Equals',
    String: true, Float: true, Integer: true, MultiChoiceInt: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', '=', '')
    }
  },
  {
    ID: '<>', name: 'Differs from',
    String: true, Float: true, Integer: true, MultiChoiceInt: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', '<>', '')
    }
  },
  {
    ID: '<', name: '<',
    Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', '<', '')
    }
  },
  {
    ID: '>', name: '>',
    Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', '>', '')
    }
  },
  {
    ID: '<=', name: '<=',
    Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', '<=', '')
    }
  },
  {
    ID: '>=', name: '>=',
    Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', '>=', '')
    }
  },
  {
    ID: 'between', name: 'Between',
    Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.CompareBetween('', '', '')
    }
  },
  {
    ID: 'CONTAINS', name: 'Contains',
    String: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', 'CONTAINS', '')
    }
  },
  {
    ID: 'NOTCONTAINS', name: 'Does not contain',
    String: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', 'NOTCONTAINS', '')
    }
  },
  {
    ID: 'STARTSWITH', name: 'Starts with',
    String: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', 'STARTSWITH', '')
    }
  },
  {
    ID: 'LIKE', name: 'Like',
    String: true,
    Create: function () {
      return SQL.WhereClause.CompareFixed('', 'LIKE', '')
    }
  },
  {
    ID: 'ISPRESENT', name: 'Is present', MultiChoiceInt: true,
    Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.IsPresent()
    }
  },
  {
    ID: 'ISABSENT', name: 'Is absent', MultiChoiceInt: true,
    Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.IsAbsent()
    }
  },
  {
    ID: 'ISNOTEMPTYSTR', name: 'Is present', String: true,
    Create: function () {
      return SQL.WhereClause.IsNotEmptyStr()
    }
  },
  {
    ID: 'ISEMPTYSTR', name: 'Is absent', String: true,
    Create: function () {
      return SQL.WhereClause.IsEmptyStr()
    }
  },
  {
    ID: '=FIELD', name: 'Equals field', MultiChoiceInt: true, //test the equality with another database field
    String: true, Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.EqualsField()
    }
  },
  {
    ID: '<>FIELD', name: 'Differs from field', MultiChoiceInt: true, //test the difference with another database field
    String: true, Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.DiffersField()
    }
  },
  {
    ID: '<FIELD', name: '< Field', //Performs a < operation with a linear function of another field
    Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.CompareField('<FIELD')
    }
  },
  {
    ID: '>FIELD', name: '> Field', //Performs a > operation with a linear function of another field
    Float: true, Integer: true,
    Create: function () {
      return SQL.WhereClause.CompareField('>FIELD')
    }
  },
  {
    ID: '_subset_', name: 'in subset',
    Create: function () {
      return SQL.WhereClause.InSubset()
    }
  },
  {
    ID: '_note_', name: 'has note containing',
    Create: function () {
      return SQL.WhereClause.NoteContains()
    }
  }
];

//Returns the field comparison operator that corresponds to a specific id
SQL.WhereClause.getFieldComparisonOperatorInfo = function (ID) {
  for (var nr in SQL.WhereClause._fieldComparisonOperators) {
    var op = SQL.WhereClause._fieldComparisonOperators[nr];
    if (op.ID == ID)
      return op;
  }
  throw Error("Invalid field comparison operator id " + ID);
};

//Returns a list of all field operators that are compatible with an SQL column data type (as defined in SQL.DataTypes)
SQL.WhereClause.getCompatibleFieldComparisonOperators = function (datatype) {
  var lst = [];
  for (var nr in SQL.WhereClause._fieldComparisonOperators) {
    var op = SQL.WhereClause._fieldComparisonOperators[nr];
    if (op[datatype])
      lst.push(op);
  }
  return lst;
};

//A class that encapsulates the comparison of a field to a fixed value
SQL.WhereClause.whcClassGenerator['comparefixed'] = function (args) {
  return SQL.WhereClause.CompareFixed(args.ColName, args.Tpe, args.CompValue);
};
SQL.WhereClause.CompareFixed = function (icolname, icomptype, ivalue) {
  var that = {};
  var fnd = false;
  for (var opnr = 0; opnr < SQL.WhereClause._fieldComparisonOperators.length; opnr++)
    if (SQL.WhereClause._fieldComparisonOperators[opnr].ID == icomptype)
      fnd = true;
  if (!fnd)
    throw Error("Invalid comparison where clause statement: " + icompoundtype);
  that.whcClass = 'comparefixed';
  that.isCompound = false;
  that.ColName = icolname;
  that.Tpe = icomptype;
  that.CompValue = ivalue;

  that.toQueryDisplayString = function (queryData, level) {
    return queryData.fieldInfoMap[that.ColName].name + ' ' + that.Tpe + ' ' + queryData.fieldInfoMap[that.ColName].toDisplayString(that.CompValue);
  };

  return that;
};

//A class that encapsulates the comparison of a field to a value range
SQL.WhereClause.whcClassGenerator['between'] = function (args) {
  return SQL.WhereClause.CompareBetween(args.ColName, args.CompValueMin, args.CompValueMax);
};
SQL.WhereClause.CompareBetween = function (icolname, ivalueMin, ivalueMax) {
  var that = {};
  that.whcClass = 'between';
  that.isCompound = false;
  that.ColName = icolname;
  that.CompValueMin = ivalueMin;
  that.CompValueMax = ivalueMax;
  that.Tpe = "between";

  that.toQueryDisplayString = function (queryData, level) {
    return queryData.fieldInfoMap[that.ColName].name + ' between ' + queryData.fieldInfoMap[that.ColName].toDisplayString(that.CompValueMin) + ' and ' + queryData.fieldInfoMap[that.ColName].toDisplayString(that.CompValueMax);
  };

  return that;
};

//A class that Encapsulates the equality comparison of a field to another field
SQL.WhereClause.whcClassGenerator['equalsfield'] = function (args) {
  var whc = SQL.WhereClause.EqualsField();
  whc.ColName = args.ColName;
  whc.ColName2 = args.ColName2;
  return whc;
};
SQL.WhereClause.EqualsField = function () {
  var that = {};
  that.whcClass = 'equalsfield';
  that.isCompound = false;
  that.ColName = "";
  that.ColName2 = "";
  that.Tpe = "=FIELD";

  that.toQueryDisplayString = function (queryData, level) {
    return queryData.fieldInfoMap[that.ColName].name + ' = ' + queryData.fieldInfoMap[that.ColName2].name;
  };

  return that;
};

//A class that Encapsulates the differential comparison of a field to another field
SQL.WhereClause.whcClassGenerator['differsfield'] = function (args) {
  var whc = SQL.WhereClause.EqualsField();
  whc.ColName = args.ColName;
  whc.ColName2 = args.ColName2;
  return whc;
};
SQL.WhereClause.DiffersField = function () {
  var that = {};
  that.whcClass = 'differsfield';
  that.isCompound = false;
  that.ColName = "";
  that.ColName2 = "";
  that.Tpe = "<>FIELD";

  that.toQueryDisplayString = function (queryData, level) {
    return queryData.fieldInfoMap[that.ColName].name + ' <> ' + queryData.fieldInfoMap[that.ColName2].name;
  };

  return that;
};


//A class that Encapsulates the numerical comparison of a field to another field
SQL.WhereClause.whcClassGenerator['comparefield'] = function (args) {
  var whc = SQL.WhereClause.CompareField(args.Tpe);
  whc.ColName = args.ColName;
  whc.ColName2 = args.ColName2;
  whc.Factor = args.Factor;
  whc.Offset = args.Offset;
  return whc;
};
SQL.WhereClause.CompareField = function (icomptype) {
  var that = {};
  that.whcClass = 'comparefield';
  that.isCompound = false;
  that.ColName = "";
  that.ColName2 = "";
  that.Tpe = icomptype;
  that.Factor = 1.0;
  that.Offset = 0.0;

  that.toQueryDisplayString = function (queryData, level) {
    var str = queryData.fieldInfoMap[that.ColName].name + ' ' + that.Tpe[0] + ' ';
    if (Math.abs(that.Factor - 1) > 1.0e-9) {
      var factorStr;
      if (that.Factor == 0)
        factorStr = '0';
      else {
        var factorVal = parseFloat(that.Factor);
        var decimCount = Math.max(0, Math.round(4 - Math.log(Math.abs(factorVal)) / Math.LN10));
        factorStr = factorVal.toFixed(decimCount);
      }
      str += factorStr + 'x';
    }
    str += queryData.fieldInfoMap[that.ColName2].name;
    var offsetStr = queryData.fieldInfoMap[that.ColName].toDisplayString(Math.abs(that.Offset));
    if (that.Offset > 0)
      str += '+' + offsetStr;
    if (that.Offset < 0)
      str += '-' + offsetStr;
    return str;
  };


  return that;
};

//A class that checks for presence of the value
SQL.WhereClause.whcClassGenerator['ispresent'] = function (args) {
  var whc = SQL.WhereClause.IsPresent();
  whc.ColName = args.ColName;
  return whc;
};
SQL.WhereClause.IsPresent = function () {
  var that = {};
  that.whcClass = 'ispresent';
  that.isCompound = false;
  that.Tpe = "ISPRESENT";

  that.toQueryDisplayString = function (queryData, level) {
    return queryData.fieldInfoMap[that.ColName].name + ' is present';
  };
  return that;
};


//A class that checks for absence of the value
SQL.WhereClause.whcClassGenerator['isabsent'] = function (args) {
  var whc = SQL.WhereClause.IsAbsent();
  whc.ColName = args.ColName;
  return whc;
};
SQL.WhereClause.IsAbsent = function () {
  var that = {};
  that.whcClass = 'isabsent';
  that.isCompound = false;
  that.Tpe = "ISABSENT";

  that.toQueryDisplayString = function (queryData, level) {
    return queryData.fieldInfoMap[that.ColName].name + ' is absent';
  };
  return that;
};


//A class that checks for presence of a string value
SQL.WhereClause.whcClassGenerator['isstringnonempty'] = function (args) {
  var whc = SQL.WhereClause.IsNotEmptyStr();
  whc.ColName = args.ColName;
  return whc;
};
SQL.WhereClause.IsNotEmptyStr = function () {
  var that = {};
  that.whcClass = 'isstringnonempty';
  that.isCompound = false;
  that.Tpe = "ISNOTEMPTYSTR";

  that.toQueryDisplayString = function (queryData, level) {
    return queryData.fieldInfoMap[that.ColName].name + ' is present';
  };
  return that;
};


//A class that checks for absence of the value
SQL.WhereClause.whcClassGenerator['isstringempty'] = function (args) {
  var whc = SQL.WhereClause.IsEmptyStr();
  whc.ColName = args.ColName;
  return whc;
};
SQL.WhereClause.IsEmptyStr = function () {
  var that = {};
  that.whcClass = 'isstringempty';
  that.isCompound = false;
  that.Tpe = "ISEMPTYSTR";

  that.toQueryDisplayString = function (queryData, level) {
    return queryData.fieldInfoMap[that.ColName].name + ' is absent';
  };
  return that;
};


//A class that checks subset membership
SQL.WhereClause.whcClassGenerator['_subset_'] = function (args) {
  var whc = SQL.WhereClause.InSubset();
  whc.Subset = args.Subset;
  whc.SubsetTable = args.SubsetTable;
  whc.PrimKey = args.PrimKey;
  return whc;
};
SQL.WhereClause.InSubset = function () {
  var that = {};
  that.whcClass = '_subset_';
  that.isCompound = false;
  that.Tpe = "_subset_";
  that.ColName = '_subset_';

  that.toQueryDisplayString = function (queryData, level) {
    var subsetName = '[Unknown]';
    if (queryData.subsetMap[this.Subset])
      subsetName = queryData.subsetMap[this.Subset].name;
    return 'in subset "' + subsetName + '"';
  };
  return that;
};


//A class that checks that a note contains a certain text
SQL.WhereClause.whcClassGenerator['_note_'] = function (args) {
  var whc = SQL.WhereClause.NoteContains();
  whc.NoteText = args.NoteText;
  whc.PrimKey = args.PrimKey;
  whc.NoteItemTable = args.NoteItemTable;
  return whc;
};
SQL.WhereClause.NoteContains = function () {
  var that = {};
  that.whcClass = '_note_';
  that.isCompound = false;
  that.Tpe = "_note_";
  that.ColName = '_note_';
  that.NoteText = '';

  that.toQueryDisplayString = function (queryData, level) {
    return 'has note containing "' + this.NoteText + '"';
  };
  return that;
};


//A class that Encapsulates the absence of a where clause
SQL.WhereClause.whcClassGenerator['trivial'] = function (args) {
  return SQL.WhereClause.Trivial();
};
SQL.WhereClause.Trivial = function () {
  var that = {};
  that.whcClass = 'trivial';
  that.isCompound = false;
  that.Tpe = "";
  that.isTrivial = true;
  that.toQueryDisplayString = function (queryData, level) {
    return 'All';
  };
  return that;
};

//A class that Encapsulates a query that should return nothing
SQL.WhereClause.whcClassGenerator['none'] = function (args) {
  return SQL.WhereClause.None();
};
SQL.WhereClause.None = function () {
  var that = {};
  that.whcClass = 'none';
  that.isCompound = false;
  that.Tpe = "None";
  that.isNone = true;
  that.toQueryDisplayString = function (queryData, level) {
    return 'None';
  };
  return that;
};


//A class that Encapsulates a compound statement
SQL.WhereClause.whcClassGenerator['compound'] = function (args) {
  var whc = SQL.WhereClause.Compound(args.Tpe, []);
  _.each(args.Components, function (comp, idx) {
    whc.addComponent(SQL.WhereClause.whcClassGenerator[comp.whcClass](comp));
  });
  return whc;
};
SQL.WhereClause.Compound = function (icompoundtype, components) {
  if ((icompoundtype != 'AND') && (icompoundtype != 'OR'))
    throw Error("Invalid compound where clause statement: " + icompoundtype);
  var that = {};
  that.whcClass = 'compound';
  that.isCompound = true;
  that.Tpe = icompoundtype;
  that.Components = components;
  if (that.Components == null) that.Components = [];
  that.addComponent = function (icomp) {
    this.Components.push(icomp);
  };
  that.getComponentCount = function () {
    return this.Components.length;
  };

  that.toQueryDisplayString = function (queryData, level) {
    if (!level) level = 0;
    var compstrs = [];
    _.each(that.Components, function (comp, idx) {
      compstrs.push(comp.toQueryDisplayString(queryData, level + 1));
    });
    var joinstr = ' ' + that.Tpe + ' ';
    if (level == 0)
      joinstr = ' <b>' + that.Tpe + '</b> ';
    var str = compstrs.join(joinstr);
    if (level == 1) str = '[' + str + ']';
    if (level > 1) str = '(' + str + ')';
    return str;
  };

  return that;
};

//A class that Encapsulates an AND statement
SQL.WhereClause.AND = function (components) {
  return SQL.WhereClause.Compound("AND", components);
};

//A class that Encapsulates an OR statement
SQL.WhereClause.OR = function (components) {
  return SQL.WhereClause.Compound("OR", components);
};


//Encodes a whereclause object to an url-friendly string
SQL.WhereClause.encode = function (whc) {
  var jsonstring = JSON.stringify(whc);
  var st = Base64.encode(jsonstring);
  st = st.replace(/\+/g, "-");
  st = st.replace(/\//g, "_");
  if (Base64.decode(st) != jsonstring) {
    var testdecoded = Base64.decode(st);
    throw Error('Invalid encoding');
  }
  //st = st.replace(/=/g, "*");!!! this should be added in client& server code
  return st;
};

//Decodes astring encoded whereclause object and returns the whereclause
SQL.WhereClause.decode = function (st) {
  st = Base64.decode(st);
  var tree = JSON.parse(st);
  return SQL.WhereClause.whcClassGenerator[tree.whcClass](tree);
};


SQL.WhereClause.clone = function (qry) {
  return SQL.WhereClause.decode(SQL.WhereClause.encode(qry));
};

//returns a new query that is based on an existing query, adding an extra statement
SQL.WhereClause.createRestriction = function (origQuery0, newStatement) {
  var origQuery = SQL.WhereClause.clone(origQuery0);
  if (origQuery.isTrivial) {
    return newStatement;
  }
  //Add the statement
  if ((origQuery.isCompound) && (origQuery.Tpe == 'AND')) {
    origQuery.addComponent(newStatement);
    return origQuery;
  }
  else {
    return SQL.WhereClause.AND([origQuery, newStatement]);
  }
};


//returns a new query that is based on an existing query, adding an extra fixed value statement
SQL.WhereClause.createValueRestriction = function (origQuery0, fieldName, value, comparisonType) {
  if (!comparisonType)
    comparisonType = '=';
  var origQuery = SQL.WhereClause.clone(origQuery0);
  var newStatement = SQL.WhereClause.CompareFixed(fieldName, comparisonType, value.toString());
  if (origQuery.isTrivial) {
    return newStatement;
  }
  //try to find a matching fixed comparison statement
  var compStatement = null;
  if (origQuery.Tpe == comparisonType)
    if (origQuery.ColName == fieldName)
      compStatement = origQuery;

  if ((origQuery.isCompound) && (origQuery.Tpe == 'AND')) {
    _.each(origQuery.Components, function (comp, idx) {
      if (comp.Tpe == comparisonType)
        if (comp.ColName == fieldName)
          compStatement = comp;
    });
  }
  if (compStatement) {//If found, adjust
    var needAdjust = true;
    if ((comparisonType == '<') || (comparisonType == '<='))
      if (value < compStatement.CompValue)
        needAdjust = false;
    if ((comparisonType == '>') || (comparisonType == '>='))
      if (value > compStatement.CompValue)
        needAdjust = false;
    compStatement.CompValue = value;
    return origQuery;
  }
  //Add the statement
  if ((origQuery.isCompound) && (origQuery.Tpe == 'AND')) {
    origQuery.addComponent(newStatement);
    return origQuery;
  }
  else {
    return SQL.WhereClause.AND([origQuery, newStatement]);
  }
};


//returns a new query that is based on an existing query, adding an extra between statement to restrict a value range
SQL.WhereClause.createRangeRestriction = function (origQuery0, fieldName, minVal, maxVal, ignorePreviousRange) {
  var origQuery = SQL.WhereClause.clone(origQuery0);
  var newStatement = SQL.WhereClause.CompareBetween(fieldName, minVal.toString(), maxVal.toString());
  if (origQuery.isTrivial) {
    return newStatement;
  }
  //try to find a matching between statement
  var betweenStatement = null;

  if (origQuery.Tpe == 'between')
    if (origQuery.ColName == fieldName)
      betweenStatement = origQuery;

  if ((origQuery.isCompound) && (origQuery.Tpe == 'AND')) {
    _.each(origQuery.Components, function (comp, idx) {
      if (comp.Tpe == 'between')
        if (comp.ColName == fieldName)
          betweenStatement = comp;
    });
  }
  if (betweenStatement) {//If found, adjust
    if (ignorePreviousRange) {
      betweenStatement.CompValueMin = minVal.toString();
      betweenStatement.CompValueMax = maxVal.toString();
    }
    else {
      betweenStatement.CompValueMin = (Math.max(parseFloat(betweenStatement.CompValueMin), parseFloat(minVal))).toString();
      betweenStatement.CompValueMax = (Math.min(parseFloat(betweenStatement.CompValueMax), parseFloat(maxVal))).toString();
    }
    return origQuery;
  }
  //Add the between statement
  if ((origQuery.isCompound) && (origQuery.Tpe == 'AND')) {
    origQuery.addComponent(newStatement);
    return origQuery;
  }
  else {
    return SQL.WhereClause.AND([origQuery, newStatement]);
  }
};

//////////////////////////////////////////////////////////////////////////////////////
// Encapsulates a sql sort statement
//////////////////////////////////////////////////////////////////////////////////////

SQL.TableSort = function (icollist) {
  var that = {};
  that.columnList = icollist;

  that.getPrimaryColumnID = function () {
    return this.columnList[this.columnList.length - 1];
  };

  that.toString = function () {
    return this.columnList.join('~');
  };
  return that;
};


module.exports = SQL;