import _keys from 'lodash/keys';
import _isString from 'lodash/isString';
import _forEach from 'lodash/forEach';
import API from 'panoptes/API';
import SQL from 'panoptes/SQL';
import attrMap from 'util/AttrMap';

//TODO THIS WHOLE FILE SHOULD'T EXIST AS THIS SHOULD BE COMPILED SERVER SIDE AND SENT DOWN IN INDEX.HTML

//Global for now till requested from server
let dataset = initialConfig.dataset; //eslint-disable-line no-undef
let workspace = initialConfig.workspace; //eslint-disable-line no-undef
let fetchedConfig = {};


function columnSpec(list) {
  let ret = {};
  list.forEach((item) => ret[item] = 'ST');
  return ret;
}

function caseChange(config) {
  let out = {};
  if (_isString(config))
    return config;
  _keys(config).forEach((key) => {
    let destKey = key[0].toLowerCase() + key.slice(1);
    let value = config[key];
    if (Array.isArray(value)) {
      let arr = [];
      value.forEach((ele) => arr.push(caseChange(ele)));
      value = arr;
    } else if (

      typeof value === 'object' &&
      key !== 'propertiesMap' &&
      key !== 'propertyGroups' &&
      key !== 'chromosomes' &&
      key !== 'summaryValues'
    ) {
      value = caseChange(value);
    }
    //Annoyingly we have to have these exceptions for config defined names - shouldn't be a problem when this is made server side.
    if (
      typeof value === 'object' &&
      key === 'summaryValues'
    ) {
      let out = {};
      _forEach(value, (val, key) => {
        let out2 = {};
        _forEach(val, (val2, key2) => out2[key2] = caseChange(val2));
        out[key] = out2;
      });
      value = out;
    }
    out[destKey] = value;
  });

  return out;
}

let parseTableSettings = function(table) {
  //TODO Default should be at import level
  let settings = {GenomeMaxViewportSizeX: 50000};
  if (table.settings) {
    //FIXME We need a proper escaping of the json
    table.settings = table.settings.replace(/`/g, '\\"');
    table.settings = table.settings.replace(/\n/g, '\\n');
    Object.assign(settings, JSON.parse(table.settings));
  }
  table.settings = settings;
};

let parseRelations = function() {
  fetchedConfig.tableCatalog.forEach((tableInfo) => {
    tableInfo.relationsChildOf = [];
    tableInfo.relationsParentOf = [];
  });
  fetchedConfig.relations.forEach((relationInfo) => {
    let childTableInfo = fetchedConfig.mapTableCatalog[relationInfo.childtableid];

    //TODO These should error on import
    //if (!childTableInfo)
    //  DQX.reportError('Invalid child table in relation: '+relationInfo.childtableid)
    let parentTableInfo = fetchedConfig.mapTableCatalog[relationInfo.parenttableid];
    //if (!parentTableInfo)
    //  DQX.reportError('Invalid parent table in relation: '+relationInfo.parenttableid)
    childTableInfo.relationsChildOf.push(relationInfo);
    parentTableInfo.relationsParentOf.push(relationInfo);
    fetchedConfig.mapTableCatalog[childTableInfo.id].propertiesMap[relationInfo.childpropid].relationParentTableId = parentTableInfo.id;
  });
};

let mapExtraTableSettings = function(tableInfo, customDataCatalog) {
  let tokensList = ['DataItemViews', 'PropertyGroups']; //List of all settings tokens for which this mechanism applies
  customDataCatalog.forEach((customData) => {
    if (customData.tableid == tableInfo.id) {
      let customSettings = JSON.parse(customData.settings);
      tokensList.forEach((token) => {
        if (customSettings[token]) {
          if (!tableInfo.settings[token]) {
            tableInfo.settings[token] = customSettings[token];
          } else {
            customSettings[token].forEach((extraItem) => {
              tableInfo.settings[token].push(extraItem);
            });
          }
        }
      });
    }
  });
};

let augmentTableInfo = function(table) {
  table.hasGenomePositions = table.IsPositionOnGenome == '1';
  table.tableNameSingle = table.name;
  table.tableNamePlural = table.name;
  if (table.settings.Description)
    table.description = table.settings.Description;
  if (table.settings.NameSingle)
    table.tableNameSingle = table.settings.NameSingle;
  if (table.settings.NamePlural)
    table.tableNamePlural = table.settings.NamePlural;
  if (table.settings.DataItemViews)
    table.dataItemViews = table.settings.DataItemViews;
  table.tableCapNameSingle = table.tableNameSingle.charAt(0).toUpperCase() + table.tableNameSingle.slice(1);
  table.tableCapNamePlural = table.tableNamePlural.charAt(0).toUpperCase() + table.tableNamePlural.slice(1);
  table.hasGenomeRegions = !!(table.settings.IsRegionOnGenome);
  if (table.hasGenomePositions) {
    //TODO Defaults should be on import
    table.chromosomeField = table.settings.Chromosome || 'chrom';
    table.positionField = table.settings.Position || 'pos';
  }
  table.quickFindFields = [table.primkey];
  if ('QuickFindFields' in table.settings)
    table.quickFindFields = table.settings.QuickFindFields.split(',');
  //TODO Remove the fa here for now - sholuld be in settings
  if (table.settings.Icon)
    table.icon = table.settings.Icon.substring(3);
  else
    table.icon = 'table';
  table.propertyGroups = {};
  if (table.settings.PropertyGroups) {
    table.settings.PropertyGroups.forEach((groupInfo) => {
      groupInfo.properties = [];
      table.propertyGroups[groupInfo.Id] = caseChange(groupInfo);
    });
  }
  table.fetchTableName = table.id + 'CMB_' + workspace;
  table.fetchSubsamplingTableName = table.id + 'CMBSORTRAND_' + workspace;
};

//let augment2DTableInfo = function(table) {
//  table.tableNameSingle = table.name;
//  table.tableNamePlural = table.name;
//  if (table.settings.NameSingle)
//    table.tableNameSingle = table.settings.NameSingle;
//  if (table.settings.NamePlural)
//    table.tableNamePlural = table.settings.NamePlural;
//  table.tableCapNameSingle = table.tableNameSingle.charAt(0).toUpperCase() + table.tableNameSingle.slice(1);
//  table.tableCapNamePlural = table.tableNamePlural.charAt(0).toUpperCase() + table.tableNamePlural.slice(1);
//
//  table.col_table = MetaData.mapTableCatalog[table.col_table];
//  table.row_table = MetaData.mapTableCatalog[table.row_table];
//  table.hasGenomePositions = table.col_table.hasGenomePositions;
//  let settings = {};
//  if (table.settings)
//    settings = _.extend(settings, JSON.parse(table.settings));
//  settings.GenomeMaxViewportSizeX = parseInt(settings.GenomeMaxViewportSizeX);
//  table.settings = settings;
//};

let parseSummaryValues = function() {
  let summaryValueMap = {};
  fetchedConfig.summaryValues.forEach((summaryValue) => {
    if (summaryValue.minval)
      summaryValue.minval = parseFloat(summaryValue.minval);
    else
      summaryValue.minval = 0;
    if (summaryValue.maxval)
      summaryValue.maxval = parseFloat(summaryValue.maxval);
    else
      summaryValue.maxval = 0;
    summaryValue.minblocksize = parseFloat(summaryValue.minblocksize);
    summaryValue.isCustom = true;
    let settings = {channelColor: 'rgb(0,0,180)'};
    if (summaryValue.settings)
      Object.assign(settings, JSON.parse(summaryValue.settings));

    summaryValue.settings = settings;
    if (summaryValue.tableid === '-') {
      summaryValue.tableid = '__reference__';
    } else {
      summaryValue.description = fetchedConfig.mapTableCatalog[summaryValue.tableid].propertiesMap[summaryValue.propid].description;
    }
    summaryValueMap[summaryValue.tableid] || (summaryValueMap[summaryValue.tableid] = {});
    summaryValueMap[summaryValue.tableid][summaryValue.propid] = summaryValue;
  });
  fetchedConfig.summaryValues = summaryValueMap;
};

let parseCustomProperties = function() {
  fetchedConfig.customProperties.forEach((prop) => {
    let tableInfo = fetchedConfig.mapTableCatalog[prop.tableid];
    prop.isCustom = (prop.source == 'custom');
    if (prop.datatype == 'Text')
      prop.isText = true;
    if ((prop.datatype == 'Value') || (prop.datatype == 'LowPrecisionValue') || (prop.datatype == 'HighPrecisionValue') || (prop.datatype == 'GeoLongitude') || (prop.datatype == 'GeoLattitude') || (prop.datatype == 'Date'))
      prop.isFloat = true;
    if (prop.datatype == 'Boolean')
      prop.isBoolean = true;
    if (prop.datatype == 'Date')
      prop.isDate = true;
    if (!prop.name) prop.name = prop.propid;
    let settings = {
      showInBrowser: false,
      channelName: '',
      channelColor: 'rgb(0,0,0)',
      connectLines: false
    };
    if (prop.isFloat) {
      settings.minval = 0;
      settings.maxval = 1;
      settings.decimDigits = 2;
    }

    if (prop.datatype == 'GeoLongitude') {
      settings.minval = 0;
      settings.maxval = 360;
      settings.decimDigits = 5;
      tableInfo.propIdGeoCoordLongit = prop.propid;
    }
    if (prop.datatype == 'GeoLattitude') {
      settings.minval = -90;
      settings.maxval = 90;
      settings.decimDigits = 5;
      tableInfo.propIdGeoCoordLattit = prop.propid;
    }
    if (prop.propid == tableInfo.primkey)
      prop.isPrimKey = true;
    let settingsObj = {};
    if (prop.settings) {
      try {
        settingsObj = JSON.parse(prop.settings);
        if ('maxval' in settingsObj)
          settingsObj.hasValueRange = true;
      } catch (e) {
        throw Error(`Invalid settings string for ${prop.tableid}.${prop.propid}: ${prop.settings}\n${e}`);
      }
      Object.assign(settings, settingsObj);
    }
    prop.settings = settings;

    // Human friendly data type string
    prop.dispDataType = 'Text';
    prop.icon = 'font';
    if (prop.settings.isCategorical) {
      prop.dispDataType = 'Categorical';
      prop.icon = 'bar-chart';
    }
    if (prop.isFloat) {
      prop.dispDataType = 'Value';
      prop.icon = 'line-chart';
    }
    if (prop.isBoolean) {
      prop.dispDataType = 'Boolean';
      prop.icon = 'check-square-o';
    }
    if (prop.isDate) {
      prop.dispDataType = 'Date';
      prop.icon = 'calendar';
    }
    if (prop.datatype == 'GeoLongitude') {
      prop.dispDataType = 'Longitude';
      prop.icon = 'globe';
    }
    if (prop.datatype == 'GeoLattitude') {
      prop.dispDataType = 'Latitude';
      prop.icon = 'globe';
    }

    //Assign property group
    if (prop.settings.GroupId)
      if (tableInfo.propertyGroups[prop.settings.GroupId]) {
        tableInfo.propertyGroups[prop.settings.GroupId].properties.push(prop);
      }
    if (!prop.settings.GroupId) {
      if (!tableInfo.propertyGroups['_UNGROUPED_']) {
        let grp = {id: '_UNGROUPED_', name: 'Properties', properties: []};
        tableInfo.propertyGroups['_UNGROUPED_'] = grp;
      }
      tableInfo.propertyGroups['_UNGROUPED_'].properties.push(prop);
    }

    // Determine table name where the column is originally defined
    if (prop.source == 'fixed') {
      prop.originalTableName = prop.tableid;
    } else {
      prop.originalTableName = prop.tableid + 'INFO_' + initialConfig.workspace; //eslint-disable-line no-undef
    }


    if (prop.isFloat) {
      if (prop.settings.decimDigits == 0)
        prop.isInt = true;
    }

    if (prop.isDate) {
      tableInfo.hasDate = true;
    }

    // Determine of datatables have geographic info
    fetchedConfig.tableCatalog.forEach((tableInfo) => {
      if (tableInfo.propIdGeoCoordLongit && tableInfo.propIdGeoCoordLattit)
        tableInfo.hasGeoCoord = true;
    });

    //Set a recommended encoder - legacy from 1.X
    let encoding = 'String';
    if (prop.datatype == 'Value') {
      encoding = 'Float3';
      if ((prop.settings.decimDigits == 0 ) || (prop.isPrimKey))
        encoding = 'Int';
    }
    if (prop.datatype == 'HighPrecisionValue') {
      encoding = 'FloatH';
    }
    if ((prop.datatype == 'Value') && (prop.propid == tableInfo.PositionField) && (tableInfo.hasGenomePositions))
      encoding = 'Int';
    if (prop.datatype == 'Boolean')
      encoding = 'Int';
    if ((prop.datatype == 'GeoLongitude') || (prop.datatype == 'GeoLattitude'))
      encoding = 'Float4';
    if ((prop.datatype == 'Date'))
      encoding = 'Float4';
    prop.encoding = encoding;

    let encodingTypes = {
      'Generic': 'String',     //returns string data, also works for other data
      'String': 'String',      //returns string data
      'Float2': 'Float',       //returns floats in 2 base64 bytes
      'Float3': 'Float',       //returns floats in 3 base64 bytes
      'Float4': 'Float',       //returns floats in 4 base64 bytes
      'FloatH': 'Float',       //returns floats as string
      'Int': 'Integer',        //returns exact integers
      'IntB64': 'Integer',     //returns exact integers, base64 encoded
      'IntDiff': 'Integer'     //returns exact integers as differences with previous values
    };
    prop.encodingType = encodingTypes[prop.encoding];
    let fetchEncodingTypes = {
      'Generic': 'GN',
      'String': 'ST',
      'Float2': 'F2',
      'Float3': 'F3',
      'Float4': 'F4',
      'FloatH': 'FH',
      'Int': 'IN',
      'IntB64': 'IB',
      'IntDiff': 'ID'
    };
    let displayEncodingTypes = {
      'Generic': 'GN',
      'String': 'ST',
      'Float2': 'FH',
      'Float3': 'FH',
      'Float4': 'FH',
      'FloatH': 'FH',
      'Int': 'IN',
      'IntB64': 'IB',
      'IntDiff': 'ID'
    };
    prop.defaultFetchEncoding = fetchEncodingTypes[prop.encoding];
    prop.defaultDisplayEncoding = displayEncodingTypes[prop.encoding];
    let alignment = {
      Value: 'right',
      HighPrecisionValue: 'right',
      Boolean: 'center',
      GeoLongitude: 'right',
      GeoLattitude: 'right',
      Date: 'center'
    };
    prop.alignment = alignment[prop.datatype] || 'left';


    prop.categoryColors = prop.settings.CategoryColors || prop.settings.categoryColors;
    prop.description = prop.settings.Description || '';
    prop.externalUrl = prop.settings.ExternalUrl;
    prop.showBar = prop.settings.showBar || (prop.settings.BarWidth > 0);
    prop.defaultWidth = prop.settings.DefaultWidth;
    prop.maxVal = prop.settings.MaxVal;
    prop.minVal = prop.settings.MinVal;
    prop.decimDigits = prop.settings.DecimDigits || prop.settings.decimDigits;
    //TODO Set end to false when import sets default properly
    prop.showInTable = prop.settings.ShowInTable || true;
    prop.showByDefault = prop.settings.TableDefaultVisible ||
      prop.isPrimKey ||
      prop.propid == tableInfo.chromosomeField ||
      prop.propid == tableInfo.positionField ||
      true;

    tableInfo.properties = tableInfo.properties || [];
    tableInfo.properties.push(prop);
    tableInfo.propertiesMap = tableInfo.propertiesMap || {};
    tableInfo.propertiesMap[prop.propid] = prop;
  });

  let promises = [];
  fetchedConfig.customProperties.forEach((prop) => {
    if (prop.settings.isCategorical) {
      promises.push(API.pageQuery({
        database: dataset,
        table: prop.originalTableName,
        columns: columnSpec([prop.propid]),
        order: prop.propid,
        distinct: true
      })
          .then((data) => {
            prop.propCategories = [];
            data.forEach((rec) => {
              prop.propCategories.push(rec[prop.propid]);
            });
          })
      );
    }
  });
  return Promise.all(promises);
};

let fetchInitialConfig = function() {
  return API.requestJSON({
    params: {
      datatype: 'custom',
      respmodule: 'panoptesserver',
      respid: 'datasetinfo',
      database: dataset
    }})
    .then((resp) => {
      if (resp.needfullreload)
        console.log('Schema full reload');
      if (resp.needconfigreload)
        console.log('Schema config reload');
      initialConfig.isManager = resp.manager; //eslint-disable-line no-undef
    })
    .then(() => Promise.all(
      [
        API.pageQuery({
          database: dataset,
          table: 'chromosomes',
          columns: {id: 'ST', len: 'ST'}
        })
          .then((data) => fetchedConfig.chromosomes = data),
        API.pageQuery({
          database: dataset,
          table: 'tablecatalog',
          columns: columnSpec(['id', 'name', 'primkey', 'IsPositionOnGenome', 'defaultQuery', 'settings']),
          order: 'ordr'
        })
          .then((data) => fetchedConfig.tableCatalog = data),
        API.pageQuery({
          database: dataset,
          table: 'customdatacatalog',
          columns: columnSpec(['tableid', 'sourceid', 'settings']),
          order: 'tableid'
        })
          .then((data) => fetchedConfig.customDataCatalog = data),
        API.pageQuery({
          database: dataset,
          table: '2D_tablecatalog',
          columns: columnSpec(['id', 'name', 'col_table', 'row_table', 'first_dimension', 'settings']),
          order: 'ordr'
        })
          .then((data) => fetchedConfig.twoDTableCatalog = data),
        API.pageQuery({
          database: dataset,
          table: 'settings',
          columns: columnSpec(['id', 'content']),
          order: 'id'
        })
          .then((data) => {
            fetchedConfig.generalSettings = {};
            data.forEach((sett) => {
              if (sett.content == 'False')
                sett.content = false;
              if (sett.id == 'IntroSections') {
                sett.content = JSON.parse(sett.content);
              }
              fetchedConfig.generalSettings[sett.id] = sett.content;
            });
          }),
        API.pageQuery({
          database: dataset,
          table: 'graphs',
          columns: columnSpec(['graphid', 'tableid', 'tpe', 'dispname', 'crosslnk']),
          order: 'graphid'
        })
          .then((data) => fetchedConfig.graphs = data),
        API.pageQuery({
          database: dataset,
          table: 'propertycatalog',
          columns: columnSpec(['propid', 'datatype', 'tableid', 'source', 'name', 'settings']),
          order: 'ordr',
          query: SQL.WhereClause.encode(SQL.WhereClause.OR([
            SQL.WhereClause.CompareFixed('workspaceid', '=', workspace),
            SQL.WhereClause.CompareFixed('workspaceid', '=', '')]))
        })
          .then((data) => fetchedConfig.customProperties = data),
        API.pageQuery({
          database: dataset,
          table: '2D_propertycatalog',
          columns: columnSpec(['id', 'tableid', 'col_table', 'row_table', 'name', 'dtype', 'settings']),
          order: 'ordr'
        })
          .then((data) => fetchedConfig.twoDProperties = data),
        API.pageQuery({
          database: dataset,
          table: 'summaryvalues',
          columns: columnSpec(['propid', 'name', 'minval', 'maxval', 'minblocksize', 'tableid', 'settings']),
          order: 'ordr',
          query: SQL.WhereClause.encode(SQL.WhereClause.AND([
            SQL.WhereClause.OR([
              SQL.WhereClause.CompareFixed('workspaceid', '=', workspace),
              SQL.WhereClause.CompareFixed('workspaceid', '=', '')]),
            SQL.WhereClause.CompareFixed('tableid', '<>', '')
          ]))
        })
          .then((data) => fetchedConfig.summaryValues = data),
        API.pageQuery({
          database: dataset,
          table: 'tablebasedsummaryvalues',
          columns: columnSpec(['tableid', 'trackid', 'trackname', 'minval', 'maxval', 'minblocksize', 'settings']),
          order: 'ordr'
        })
          .then((data) => fetchedConfig.tableBasedSummaryValues = data),
        API.pageQuery({
          database: dataset,
          table: 'relations',
          columns: columnSpec(['childtableid', 'childpropid', 'parenttableid', 'parentpropid', 'forwardname', 'reversename']),
          order: 'childtableid'
        })
          .then((data) => fetchedConfig.relations = data),
        API.pageQuery({
          database: dataset,
          table: 'externallinks',
          columns: columnSpec(['linktype', 'linkname', 'linkurl']),
          order: 'linkname'
        })
          .then((data) => fetchedConfig.externalLinks = data)
      ]
    ))
    .then(() => {
      fetchedConfig.mapTableCatalog = {};
      fetchedConfig.tableCatalog.forEach((table) => {
        parseTableSettings(table);
        mapExtraTableSettings(table, fetchedConfig.customDataCatalog);
        augmentTableInfo(table);
        fetchedConfig.mapTableCatalog[table.id] = table;
      });
      fetchedConfig.map2DTableCatalog = {};
      fetchedConfig.twoDTableCatalog.forEach((table) => {
        //augment2DTableInfo(table);
        fetchedConfig.map2DTableCatalog[table.id] = table;
      });
      //parse graph info
      fetchedConfig.tableCatalog.forEach((tableInfo) => {
        tableInfo.trees = [];
      });
      fetchedConfig.graphs.forEach((graphInfo) => {
        if (graphInfo.tpe == 'tree') {
          fetchedConfig.mapTableCatalog[graphInfo.tableid].trees.push({
            id: graphInfo.graphid,
            name: graphInfo.dispname,
            crossLink: graphInfo.crosslnk
          });
        }
      });
    })
    .then(parseCustomProperties)
    .then(parseSummaryValues)
    .then(() => {
    //parse2DProperties();
    //parseTableBasedSummaryValues();
      parseRelations();
    //parseStoredSubsets();
    })
    .then(() => {
      let defaultQueries = {};
      let subsets = {};
      //Turn empty queries into trivial ones
      fetchedConfig.tableCatalog.forEach((table) => {
        if (table.defaultQuery != '')
          defaultQueries[table.id] = table.defaultQuery;
        else
          defaultQueries[table.id] = SQL.WhereClause.encode(SQL.WhereClause.Trivial());
        subsets[table.id] = [];
      });
      //Convert chromosome lengths to integer values
      fetchedConfig.chromosomes = attrMap(fetchedConfig.chromosomes.map((chrom) =>
        ({id: chrom.id, len: parseFloat(chrom.len) * 1000000})
      ), 'id');

      return caseChange(Object.assign(initialConfig, { //eslint-disable-line no-undef
        user: {
          id: initialConfig.userID, //eslint-disable-line no-undef
          isManager: initialConfig.isManager //eslint-disable-line no-undef
        },

        chromosomes: fetchedConfig.chromosomes,
        tables: fetchedConfig.mapTableCatalog,
        settings: fetchedConfig.generalSettings,
        summaryValues: fetchedConfig.summaryValues,
        tableRelations: fetchedConfig.tableRelations,
        defaultQueries: defaultQueries,
        subsets: subsets
      }));
    });
};

module.exports = fetchInitialConfig;
