import _cloneDeep from 'lodash.clonedeep';
import _filter from 'lodash.filter';
import _assign from 'lodash.assign';
import {toDataType}  from 'panoptes/Formatter';


let SQL = {};


//////////////////////////////////////////////////////////////////////////////////////
// Encapsulates information about an SQL table column
//////////////////////////////////////////////////////////////////////////////////////

SQL.DataTypes = ['String', 'Float', 'Integer', 'MultiChoiceInt'];

SQL.TableColInfo = function(iID, iname, idatatype, ichoicelist) {
  let that = {};
  that.ID = iID;
  that.name = iname;
  that.datatype = idatatype;
  that.choicelist = ichoicelist;

  //Converts a column content value to a display string
  that.content2Display = function(vl) {
    return vl.toString();
  };

  //Converts a display string to a column content value
  that.display2Content = function(str) {
    return str;
  };

  //returns true if this column is of numerical type
  that.isNumerical = function() {
    return (this.datatype == 'Float') || (this.datatype == 'Integer');
  };

  //returns true of this column contains multiple choice values
  that.isMultipleCoice = function() {
    return (this.datatype == 'MultiChoiceInt') || ( this.choicelist && (this.choicelist.length > 0) );
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
    ID: '=', name: 'is equal to',
    String: true, Float: true, Integer: true, MultiChoiceInt: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', '=', '');
    },
    fieldType: 'value'
  },
  {
    ID: '<>', name: 'is not equal to',
    String: true, Float: true, Integer: true, MultiChoiceInt: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', '<>', '');
    },
    fieldType: 'value'
  },
  {
    ID: '<', name: 'is less than',
    Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', '<', '');
    },
    fieldType: 'value'
  },
  {
    ID: '>', name: 'is more than',
    Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', '>', '');
    },
    fieldType: 'value'
  },
  {
    ID: '<=', name: 'is less than or equal to',
    Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', '<=', '');
    },
    fieldType: 'value'
  },
  {
    ID: '>=', name: 'is more than or equal to',
    Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', '>=', '');
    },
    fieldType: 'value'
  },
  {
    ID: 'between', name: 'is between',
    Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.CompareBetween('', '', '');
    },
    fieldType: 'minMax'
  },
  {
    ID: 'CONTAINS', name: 'contains case-sensitive',
    String: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', 'CONTAINS', '');
    },
    fieldType: 'value',
    allowSubstring: true
  },
  {
    ID: 'CONTAINS_CASE_INSENSITIVE', name: 'contains case-insensitive',
    String: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', 'CONTAINS_CASE_INSENSITIVE', '');
    },
    fieldType: 'value',
    allowSubstring: true
  },
  {
    ID: 'NOTCONTAINS', name: 'does not contain case-sensitive',
    String: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', 'NOTCONTAINS', '');
    },
    fieldType: 'value',
    allowSubstring: true
  },
  {
    ID: 'NOT_CONTAINS_CASE_INSENSITIVE', name: 'does not contain case-insensitive',
    String: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', 'NOT_CONTAINS_CASE_INSENSITIVE', '');
    },
    fieldType: 'value',
    allowSubstring: true
  },
  {
    ID: 'STARTSWITH', name: 'starts with',
    String: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', 'STARTSWITH', '');
    },
    fieldType: 'value',
    allowSubstring: true
  },
  {
    ID: 'ENDSWITH', name: 'ends with',
    String: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', 'ENDSWITH', '');
    },
    fieldType: 'value',
    allowSubstring: true
  },
  {
    ID: 'LIKE', name: 'matches the pattern',
    String: true,
    Create() {
      return SQL.WhereClause.CompareFixed('', 'LIKE', '');
    },
    fieldType: 'value',
    allowSubstring: true
  },
  {
    ID: 'ISPRESENT', name: 'is present', MultiChoiceInt: true,
    Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.IsPresent();
    },
    fieldType: 'none'
  },
  {
    ID: 'ISABSENT', name: 'is absent', MultiChoiceInt: true,
    Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.IsAbsent();
    },
    fieldType: 'none'
  },
  {
    ID: 'ISNOTEMPTYSTR', name: 'is not empty', String: true,
    Create() {
      return SQL.WhereClause.IsNotEmptyStr();
    },
    fieldType: 'none'
  },
  {
    ID: 'ISEMPTYSTR', name: 'is empty', String: true,
    Create() {
      return SQL.WhereClause.IsEmptyStr();
    },
    fieldType: 'none'
  },
  {
    ID: '=FIELD', name: 'is equal to column', MultiChoiceInt: true, //test the equality with another database field
    String: true, Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.EqualsField();
    },
    fieldType: 'otherColumn'
  },
  {
    ID: '<>FIELD', name: 'is not equal to column', MultiChoiceInt: true, //test the difference with another database field
    String: true, Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.DiffersField();
    },
    fieldType: 'otherColumn'
  },
  {
    ID: '<FIELD', name: 'is less than column', //Performs a < operation with a linear function of another field
    Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.CompareField('<FIELD');
    },
    fieldType: 'otherColumnWithFactorAndOffset'
  },
  {
    ID: '>FIELD', name: 'is more than column', //Performs a > operation with a linear function of another field
    Float: true, Integer: true,
    Create() {
      return SQL.WhereClause.CompareField('>FIELD');
    },
    fieldType: 'otherColumnWithFactorAndOffset'
  },
  {
    ID: '_subset_', name: 'is in subset',
    Create() {
      return SQL.WhereClause.InSubset();
    },
    fieldType: 'subset'
  },
  {
    ID: '_note_', name: 'has a note that contains',
    Create() {
      return SQL.WhereClause.NoteContains();
    },
    fieldType: 'note'
  }
];

//Returns the field comparison operator that corresponds to a specific id
SQL.WhereClause.getFieldComparisonOperatorInfo = function(ID) {
  for (let nr in SQL.WhereClause._fieldComparisonOperators) {
    let op = SQL.WhereClause._fieldComparisonOperators[nr];
    if (op.ID == ID)
      return op;
  }
  throw Error(`Invalid field comparison operator id ${ID}`);
};

//Returns a list of all field operators that are compatible with an SQL column data type (as defined in SQL.DataTypes)
SQL.WhereClause.getCompatibleFieldComparisonOperators = function(datatype) {
  let lst = [];
  for (let nr in SQL.WhereClause._fieldComparisonOperators) {
    let op = SQL.WhereClause._fieldComparisonOperators[nr];
    if (op[datatype])
      lst.push(op);
  }
  return lst;
};

//A class that encapsulates the comparison of a field to a fixed value
SQL.WhereClause.whcClassGenerator['comparefixed'] = function(args) {
  return SQL.WhereClause.CompareFixed(args.ColName, args.type, args.CompValue);
};
SQL.WhereClause.CompareFixed = function(icolname, icomptype, ivalue) {
  let that = {};
  let fnd = false;
  for (let opnr = 0; opnr < SQL.WhereClause._fieldComparisonOperators.length; opnr++)
    if (SQL.WhereClause._fieldComparisonOperators[opnr].ID == icomptype)
      fnd = true;
  if (!fnd)
    throw Error(`Invalid comparison where clause statement: ${icomptype}`);
  that.whcClass = 'comparefixed';
  that.isCompound = false;
  that.ColName = icolname;
  that.type = icomptype;
  that.CompValue = ivalue;

  let displayType = undefined;
  switch (that.type) {
  case '<>':
    displayType = '≠';
    break;
  case 'CONTAINS':
    displayType = 'contains c.s.';
    break;
  case 'NOTCONTAINS':
    displayType = 'does not contain c.s.';
    break;
  case 'STARTSWITH':
    displayType = 'starts with';
    break;
  case 'ENDSWITH':
    displayType = 'ends with';
    break;
  case 'LIKE':
    displayType = 'matches the pattern';
    break;
  case 'CONTAINS_CASE_INSENSITIVE':
    displayType = 'contains c.i.';
    break;
  case 'NOT_CONTAINS_CASE_INSENSITIVE':
    displayType = 'does not contain c.i.';
    break;
  default:
    displayType = icomptype;
  }

  that.toQueryDisplayString = function(queryData) {
    let displayValue = queryData.fieldInfoMap[that.ColName].toDisplayString(that.CompValue);
    if (displayValue === '') {
      displayValue = '""';
    } else if (typeof that.CompValue === 'string' || that.CompValue instanceof String) {
      displayValue = `"${displayValue}"`;
    }
    return `${queryData.fieldInfoMap[that.ColName].name} ${displayType} ${displayValue}`;
  };

  return that;
};

//A class that encapsulates the comparison of a field to a value range
SQL.WhereClause.whcClassGenerator['between'] = function(args) {
  return SQL.WhereClause.CompareBetween(args.ColName, args.CompValueMin, args.CompValueMax);
};
SQL.WhereClause.CompareBetween = function(icolname, ivalueMin, ivalueMax) {
  let that = {};
  that.whcClass = 'between';
  that.isCompound = false;
  that.ColName = icolname;
  that.CompValueMin = ivalueMin;
  that.CompValueMax = ivalueMax;
  that.type = 'between';

  that.toQueryDisplayString = function(queryData, level) {
    return `${queryData.fieldInfoMap[that.ColName].name} is between ${queryData.fieldInfoMap[that.ColName].toDisplayString(that.CompValueMin)} and ${queryData.fieldInfoMap[that.ColName].toDisplayString(that.CompValueMax)}`;
  };

  return that;
};

//A class that Encapsulates the equality comparison of a field to another field
SQL.WhereClause.whcClassGenerator['equalsfield'] = function(args) {
  let whc = SQL.WhereClause.EqualsField();
  whc.ColName = args.ColName;
  whc.ColName2 = args.ColName2;
  return whc;
};
SQL.WhereClause.EqualsField = function() {
  let that = {};
  that.whcClass = 'equalsfield';
  that.isCompound = false;
  that.ColName = '';
  that.ColName2 = '';
  that.type = '=FIELD';

  that.toQueryDisplayString = function(queryData, level) {
    return `${queryData.fieldInfoMap[that.ColName].name} = ${queryData.fieldInfoMap[that.ColName2].name}`;
  };

  return that;
};

//A class that Encapsulates the differential comparison of a field to another field
SQL.WhereClause.whcClassGenerator['differsfield'] = function(args) {
  let whc = SQL.WhereClause.DiffersField();
  whc.ColName = args.ColName;
  whc.ColName2 = args.ColName2;
  return whc;
};
SQL.WhereClause.DiffersField = function() {
  let that = {};
  that.whcClass = 'differsfield';
  that.isCompound = false;
  that.ColName = '';
  that.ColName2 = '';
  that.type = '<>FIELD';

  that.toQueryDisplayString = function(queryData, level) {
    return `${queryData.fieldInfoMap[that.ColName].name} ≠ ${queryData.fieldInfoMap[that.ColName2].name}`;
  };

  return that;
};


//A class that Encapsulates the numerical comparison of a field to another field
SQL.WhereClause.whcClassGenerator['comparefield'] = function(args) {
  let whc = SQL.WhereClause.CompareField(args.type);
  whc.ColName = args.ColName;
  whc.ColName2 = args.ColName2;
  whc.Factor = args.Factor;
  whc.Offset = args.Offset;
  return whc;
};
SQL.WhereClause.CompareField = function(icomptype) {
  let that = {};
  that.whcClass = 'comparefield';
  that.isCompound = false;
  that.ColName = '';
  that.ColName2 = '';
  that.type = icomptype;
  that.Factor = '1';
  that.Offset = '0';

  that.toQueryDisplayString = function(queryData, level) {

    let str = `${queryData.fieldInfoMap[that.ColName].name} ${that.type[0]} `;

    // If there is a factor or an offset, open bracket
    if ((!isNaN(that.Factor) && that.Factor != 1) || (!isNaN(that.Offset) && that.Offset != 0)) {
      str += '(';
    }

    let factorStr = toDataType('float-string-with-limits', that.Factor);
    if (that.Factor != 1) {
      str += `${factorStr} x `;
    }
    // If the factor is one, then don't show it.

    // Show the name of the column being compared
    str += queryData.fieldInfoMap[that.ColName2].name;

    let offsetStr = toDataType('float-string-with-limits', that.Offset);
    if (that.Offset > 0) {
      // If the offset is more than zero, then show a plus sign
      str += ` + ${offsetStr}`;
    } else if (that.Offset < 0) {
      // If the offset is less than zero, then show a minus sign
      str += ` - ${offsetStr}`;
    }
    // If the offset is zero, then don't show it.

    // If there is a factor or an offset, close bracket
    if ((!isNaN(that.Factor) && that.Factor != 1) || (!isNaN(that.Offset) && that.Offset != 0)) {
      str += ')';
    }

    return str;
  };


  return that;
};

//A class that checks for presence of the value
SQL.WhereClause.whcClassGenerator['ispresent'] = function(args) {
  let whc = SQL.WhereClause.IsPresent();
  whc.ColName = args.ColName;
  return whc;
};
SQL.WhereClause.IsPresent = function(colName) {
  let that = {};
  if (colName) {
    that.ColName = colName;
  }
  that.whcClass = 'ispresent';
  that.isCompound = false;
  that.type = 'ISPRESENT';

  that.toQueryDisplayString = function(queryData, level) {
    return `${queryData.fieldInfoMap[that.ColName].name} ≠ NULL`;
  };
  return that;
};


//A class that checks for absence of the value
SQL.WhereClause.whcClassGenerator['isabsent'] = function(args) {
  let whc = SQL.WhereClause.IsAbsent();
  whc.ColName = args.ColName;
  return whc;
};
SQL.WhereClause.IsAbsent = function() {
  let that = {};
  that.whcClass = 'isabsent';
  that.isCompound = false;
  that.type = 'ISABSENT';

  that.toQueryDisplayString = function(queryData, level) {
    return `${queryData.fieldInfoMap[that.ColName].name} = NULL`;
  };
  return that;
};


//A class that checks for presence of a string value
SQL.WhereClause.whcClassGenerator['isstringnonempty'] = function(args) {
  let whc = SQL.WhereClause.IsNotEmptyStr();
  whc.ColName = args.ColName;
  return whc;
};
SQL.WhereClause.IsNotEmptyStr = function() {
  let that = {};
  that.whcClass = 'isstringnonempty';
  that.isCompound = false;
  that.type = 'ISNOTEMPTYSTR';

  that.toQueryDisplayString = function(queryData, level) {
    return `${queryData.fieldInfoMap[that.ColName].name} ≠ ""`;
  };
  return that;
};


//A class that checks for absence of the value
SQL.WhereClause.whcClassGenerator['isstringempty'] = function(args) {
  let whc = SQL.WhereClause.IsEmptyStr();
  whc.ColName = args.ColName;
  return whc;
};
SQL.WhereClause.IsEmptyStr = function() {
  let that = {};
  that.whcClass = 'isstringempty';
  that.isCompound = false;
  that.type = 'ISEMPTYSTR';

  that.toQueryDisplayString = function(queryData, level) {
    return `${queryData.fieldInfoMap[that.ColName].name} = ""`;
  };
  return that;
};


//A class that checks subset membership
SQL.WhereClause.whcClassGenerator['_subset_'] = function(args) {
  let whc = SQL.WhereClause.InSubset();
  whc.Subset = args.Subset;
  whc.SubsetTable = args.SubsetTable;
  whc.PrimKey = args.PrimKey;
  return whc;
};
SQL.WhereClause.InSubset = function() {
  let that = {};
  that.whcClass = '_subset_';
  that.isCompound = false;
  that.type = '_subset_';
  that.ColName = '_subset_';

  that.toQueryDisplayString = function(queryData, level) {
    let subsetName = '[Unknown]';
    if (queryData.subsetMap[this.Subset])
      subsetName = queryData.subsetMap[this.Subset].name;
    return `is in subset "${subsetName}"`;
  };
  return that;
};


//A class that checks that a note contains a certain text
SQL.WhereClause.whcClassGenerator['_note_'] = function(args) {
  let whc = SQL.WhereClause.NoteContains();
  whc.NoteText = args.NoteText;
  whc.PrimKey = args.PrimKey;
  whc.NoteItemTable = args.NoteItemTable;
  return whc;
};
SQL.WhereClause.NoteContains = function() {
  let that = {};
  that.whcClass = '_note_';
  that.isCompound = false;
  that.type = '_note_';
  that.ColName = '_note_';
  that.NoteText = '';

  that.toQueryDisplayString = function(queryData, level) {
    return `has a note that contains "${this.NoteText}"`;
  };
  return that;
};


//A class that Encapsulates the absence of a where clause
SQL.WhereClause.whcClassGenerator['trivial'] = function(args) {
  return SQL.WhereClause.Trivial();
};
SQL.WhereClause.Trivial = function() {
  let that = {};
  that.whcClass = 'trivial';
  that.isCompound = false;
  that.type = '';
  that.isTrivial = true;
  that.toQueryDisplayString = function(queryData, level) {
    return 'All';
  };
  return that;
};

//A class that Encapsulates a query that should return nothing
SQL.WhereClause.whcClassGenerator['none'] = function(args) {
  return SQL.WhereClause.None();
};
SQL.WhereClause.None = function() {
  let that = {};
  that.whcClass = 'none';
  that.isCompound = false;
  that.type = 'None';
  that.isNone = true;
  that.toQueryDisplayString = function(queryData, level) {
    return 'None';
  };
  return that;
};


//A class that Encapsulates a compound statement
SQL.WhereClause.whcClassGenerator['compound'] = function(args) {
  let whc = SQL.WhereClause.Compound(args.type, []);
  args.components.forEach((comp, idx) =>
    whc.addComponent(SQL.WhereClause.whcClassGenerator[comp.whcClass](comp))
  );
  return whc;
};
SQL.WhereClause.Compound = function(icompoundtype, components) {
  if ((icompoundtype != 'AND') && (icompoundtype != 'OR'))
    throw Error(`Invalid compound where clause statement: ${icompoundtype}`);
  let that = {};
  that.whcClass = 'compound';
  that.isCompound = true;
  that.type = icompoundtype;
  that.components = _filter(components, (comp) => !comp.isTrivial);
  if (that.components == null) that.components = [];
  that.addComponent = function(icomp) {
    icomp.parent = that;
    this.components.push(icomp);
  };
  that.getComponentCount = function() {
    return this.components.length;
  };
  that.inlineIfOneChild = function() {
    if (that.getComponentCount() === 1) {
      let parent = that.parent;
      let isRoot = that.isRoot;
      _assign(that, that.components[0]);
      that.parent = parent;
      that.isRoot = isRoot;
    }
  };
  that.removeChild = function(child) {
    that.components = that.components.filter((myChild) => myChild !== child);
    that.inlineIfOneChild();
  };

  that.toQueryDisplayString = function(queryData, level) {
    if (!level) level = 0;
    let compstrs = [];
    that.components.forEach((comp, idx) =>
      compstrs.push(comp.toQueryDisplayString(queryData, level + 1))
    );
    let joinstr = ` ${that.type} `;
    //Taken out as we don't put HTML in query strings anymore with React
    //if (level == 0)
    //  joinstr = ' <b>' + that.type + '</b> ';
    let str = compstrs.join(joinstr);
    if (level >= 1) str = `(${str})`;
    return str;
  };

  return that;
};

//A class that Encapsulates an AND statement
SQL.WhereClause.AND = function(components) {
  return SQL.WhereClause.Compound('AND', components);
};

//A class that Encapsulates an OR statement
SQL.WhereClause.OR = function(components) {
  return SQL.WhereClause.Compound('OR', components);
};


//Encodes a whereclause object to an url-friendly string
SQL.WhereClause.encode = function(whc) {
  whc = _cloneDeep(whc);
  //Remove to stop cycles before JSONify
  function removeParents(component) {
    delete component.parent;
    //Need to keep compatibility... rename a few things for sanity
    component.Components = (component.components === undefined) ? component.Components : component.components;
    component.Tpe = (component.type === undefined) ? component.Tpe : component.type;
    if (component.components)
      component.components.forEach(removeParents);
    delete component.components;
    delete component.type;
  }
  removeParents(whc);
  let jsonstring = JSON.stringify(whc);
  //st = st.replace(/=/g, "*");!!! this should be added in client& server code
  return jsonstring;
};

//Decodes astring encoded whereclause object and returns the whereclause
SQL.WhereClause.decode = function(tree) {
  try {
    tree = JSON.parse(tree);
  } catch (e) {
    console.error("Bad query - can't parse. Using null query");
    return SQL.WhereClause.Trivial();
  }
  function makeCompatible(parent, component) {
    //Need to keep compatibility... rename a few things for sanity
    component.components = (component.Components === undefined) ? component.components : component.Components;
    component.type = (component.Tpe === undefined) ? component.type : component.Tpe;
    delete component.Tpe;
    delete component.Components;
    if (component.components)
      component.components.forEach(makeCompatible.bind(this, component));
  }
  makeCompatible(null, tree);
  let query = SQL.WhereClause.whcClassGenerator[tree.whcClass](tree);
  function assignParents(parent, component) {
    component.parent = parent;
    if (component.components)
      component.components.forEach(assignParents.bind(this, component));
  }
  assignParents(null, query);
  function cleanUp(parent, component) {
    if (component.isCompound)
      component.inlineIfOneChild();
    if (component.components)
      component.components.forEach(cleanUp.bind(this, component));
  }
  cleanUp(null, query);
  query.isRoot = true;
  return query;
};


SQL.WhereClause.clone = function(qry) {
  return SQL.WhereClause.decode(SQL.WhereClause.encode(qry));
};

//returns a new query that is based on an existing query, adding an extra statement
SQL.WhereClause.createRestriction = function(origQuery0, newStatement) {
  let origQuery = SQL.WhereClause.clone(origQuery0);
  if (origQuery.isTrivial) {
    return newStatement;
  }
  //Add the statement
  if ((origQuery.isCompound) && (origQuery.type == 'AND')) {
    origQuery.addComponent(newStatement);
    return origQuery;
  } else {
    return SQL.WhereClause.AND([origQuery, newStatement]);
  }
};


//returns a new query that is based on an existing query, adding an extra fixed value statement
SQL.WhereClause.createValueRestriction = function(origQuery0, fieldName, value, comparisonType) {
  if (!comparisonType)
    comparisonType = '=';
  let origQuery = SQL.WhereClause.clone(origQuery0);
  let newStatement = SQL.WhereClause.CompareFixed(fieldName, comparisonType, value.toString());
  if (origQuery.isTrivial) {
    return newStatement;
  }
  //try to find a matching fixed comparison statement
  let compStatement = null;
  if (origQuery.type == comparisonType)
    if (origQuery.ColName == fieldName)
      compStatement = origQuery;

  if ((origQuery.isCompound) && (origQuery.type == 'AND')) {
    origQuery.components.forEach((comp, idx) => {
      if (comp.type == comparisonType)
        if (comp.ColName == fieldName)
          compStatement = comp;
    });
  }
  if (compStatement) { //If found, adjust
    compStatement.CompValue = value;
    return origQuery;
  }
  //Add the statement
  if ((origQuery.isCompound) && (origQuery.type == 'AND')) {
    origQuery.addComponent(newStatement);
    return origQuery;
  } else {
    return SQL.WhereClause.AND([origQuery, newStatement]);
  }
};


//returns a new query that is based on an existing query, adding an extra between statement to restrict a value range
SQL.WhereClause.createRangeRestriction = function(origQuery0, fieldName, minVal, maxVal, ignorePreviousRange) {
  let origQuery = SQL.WhereClause.clone(origQuery0);
  let newStatement = SQL.WhereClause.CompareBetween(fieldName, minVal.toString(), maxVal.toString());
  if (origQuery.isTrivial) {
    return newStatement;
  }
  //try to find a matching between statement
  let betweenStatement = null;

  if (origQuery.type == 'between')
    if (origQuery.ColName == fieldName)
      betweenStatement = origQuery;

  if ((origQuery.isCompound) && (origQuery.type == 'AND')) {
    origQuery.components.forEach((comp, idx) => {
      if (comp.type == 'between')
        if (comp.ColName == fieldName)
          betweenStatement = comp;
    });
  }
  if (betweenStatement) { //If found, adjust
    if (ignorePreviousRange) {
      betweenStatement.CompValueMin = minVal.toString();
      betweenStatement.CompValueMax = maxVal.toString();
    } else {
      betweenStatement.CompValueMin = (Math.max(parseFloat(betweenStatement.CompValueMin), parseFloat(minVal))).toString();
      betweenStatement.CompValueMax = (Math.min(parseFloat(betweenStatement.CompValueMax), parseFloat(maxVal))).toString();
    }
    return origQuery;
  }
  //Add the between statement
  if ((origQuery.isCompound) && (origQuery.type == 'AND')) {
    origQuery.addComponent(newStatement);
    return origQuery;
  } else {
    return SQL.WhereClause.AND([origQuery, newStatement]);
  }
};

//////////////////////////////////////////////////////////////////////////////////////
// Encapsulates a sql sort statement
//////////////////////////////////////////////////////////////////////////////////////

SQL.TableSort = function(icollist) {
  let that = {};
  that.columnList = icollist;

  that.getPrimaryColumnID = function() {
    return this.columnList[this.columnList.length - 1];
  };

  that.toString = function() {
    return this.columnList.join('~');
  };
  return that;
};

SQL.nullQuery = SQL.WhereClause.encode(SQL.WhereClause.Trivial());

export default SQL;
