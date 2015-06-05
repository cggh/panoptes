const _ = require('lodash');
const API = require('panoptes/API');
const SQL = require('panoptes/SQL');

//TODO THIS WHOLE FILE SHOULD'T EXIST AS THIS SHOULD BE COMPILED SERVER SIDE AND SENT DOWN IN INDEX.HTML


let dataset = initialConfig.dataset;
let workspace = initialConfig.workspace;
let fetchedConfig = {};


function columnSpec(list) {
  let ret = {}
  _.each(list, (item) => ret[item] = 'ST');
  return ret;
}

let parseTableSettings = function (table) {
  //TODO Default should be at import level
  let settings = {GenomeMaxViewportSizeX: 50000};
  if (table.settings) {
    //FIXME We need a proper escaping of the json
    table.settings = table.settings.replace(/`/g, '\\"');
    table.settings = table.settings.replace(/\n/g, "\\n");
    settings = _.extend(settings, JSON.parse(table.settings));
  }
  table.settings = settings;
}

let mapExtraTableSettings = function (tableInfo, customDataCatalog) {
  let tokensList = ['DataItemViews', 'PropertyGroups']; //List of all settings tokens for which this mechanism applies
  _.each(customDataCatalog, function (customData) {
    if (customData.tableid == tableInfo.id) {
      let customSettings = JSON.parse(customData.settings);
      _.each(tokensList, function (token) {
        if (customSettings[token]) {
          if (!tableInfo.settings[token]) {
            tableInfo.settings[token] = customSettings[token];
          }
          else {
            _.each(customSettings[token], function (extraItem) {
              tableInfo.settings[token].push(extraItem);
            });
          }
        }
      });
    }
  });
};

let augmentTableInfo = function (table) {
  table.hasGenomePositions = table.IsPositionOnGenome == '1';
  table.tableNameSingle = table.name;
  table.tableNamePlural = table.name;
  if (table.settings.NameSingle)
    table.tableNameSingle = table.settings.NameSingle;
  if (table.settings.NamePlural)
    table.tableNamePlural = table.settings.NamePlural;
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
  table.icon = table.settings.Icon;
  table.propertyGroups = {};
  if (table.settings.PropertyGroups) {
    _.each(table.settings.PropertyGroups, function (groupInfo) {
      groupInfo.properties = [];
      table.propertyGroups[groupInfo.Id] = groupInfo;
    });
  }
}

let augment2DTableInfo = function (table) {
  table.tableNameSingle = table.name;
  table.tableNamePlural = table.name;
  if (table.settings.NameSingle)
    table.tableNameSingle = table.settings.NameSingle;
  if (table.settings.NamePlural)
    table.tableNamePlural = table.settings.NamePlural;
  table.tableCapNameSingle = table.tableNameSingle.charAt(0).toUpperCase() + table.tableNameSingle.slice(1);
  table.tableCapNamePlural = table.tableNamePlural.charAt(0).toUpperCase() + table.tableNamePlural.slice(1);

  table.col_table = MetaData.mapTableCatalog[table.col_table];
  table.row_table = MetaData.mapTableCatalog[table.row_table];
  table.hasGenomePositions = table.col_table.hasGenomePositions;
  var settings = {};
  if (table.settings)
    settings = _.extend(settings, JSON.parse(table.settings));
  settings.GenomeMaxViewportSizeX = parseInt(settings.GenomeMaxViewportSizeX);
  table.settings = settings;
};

let parseSummaryValues = function () {
  _.each(fetchedConfig.summaryValues, function (summaryValue) {
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
    var settings = {channelColor: 'rgb(0,0,180)'};
    if (summaryValue.settings)
      settings = _.extend(settings, JSON.parse(summaryValue.settings));
    summaryValue.settings = settings;
  });
};

let parseCustomProperties = function () {
  _.each(fetchedConfig.customProperties, function (prop) {
    var tableInfo = fetchedConfig.mapTableCatalog[prop.tableid];
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
    var settings = {
      showInTable: true,
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
    ;
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
    if (prop.settings) {
      try {
        var settingsObj = JSON.parse(prop.settings);
        if ('maxval' in settingsObj)
          settingsObj.hasValueRange = true;
      }
      catch (e) {
        throw Error(`Invalid settings string for ${prop.tableid}.${prop.propid}: ${prop.settings}\n${e}`);
      }
      settings = _.extend(settings, settingsObj);
    }
    prop.settings = settings;

    // Human friendly data type string
    prop.dispDataType = 'Text';
    if (prop.settings.isCategorical)
      prop.dispDataType = 'Categorical';
    if (prop.isFloat)
      prop.dispDataType = 'Value';
    if (prop.isBoolean)
      prop.dispDataType = 'Boolean';
    if (prop.isDate)
      prop.dispDataType = 'Date';
    if (prop.datatype == 'GeoLongitude')
      prop.dispDataType = 'Longitude';
    if (prop.datatype == 'GeoLattitude')
      prop.dispDataType = 'Latitude';

    //Assign property group
    prop.group = null;
    if (prop.settings.GroupId)
      if (tableInfo.propertyGroups[prop.settings.GroupId]) {
        tableInfo.propertyGroups[prop.settings.GroupId].properties.push(prop.propid);
      }
    //if (!prop.group) {
    //  if (!tableInfo.propertyGroupMap['']) {
    //    var grp = {Id: '', Name: 'Properties', properties: []};
    //    tableInfo.propertyGroupMap[''] = grp;
    //    tableInfo.propertyGroups.push(grp);
    //  }
    //  prop.group = tableInfo.propertyGroupMap[''];
    //  tableInfo.propertyGroupMap[''].properties.push(prop);
    //}

    // Determine table name where the column is originally defined
    if (prop.source == 'fixed') {
      prop.originalTableName = prop.tableid;
    }
    else {
      prop.originalTableName = prop.tableid + 'INFO_' + initialConfig.workspace;
    }


    if (prop.isFloat) {
      if (prop.settings.decimDigits == 0)
        prop.isInt = true;
    }

    if (prop.isDate) {
      tableInfo.hasDate = true;
    }

    // Determine of datatables have geographic info
    _.each(fetchedConfig.tableCatalog, function (tableInfo) {
      if (tableInfo.propIdGeoCoordLongit && tableInfo.propIdGeoCoordLattit)
        tableInfo.hasGeoCoord = true;
    });

    tableInfo.properties = tableInfo.properties || [];
    tableInfo.properties.push(prop);
  });

  var promises = [];
  _.each(fetchedConfig.customProperties, function (prop) {
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
            _.each(data, function (rec) {
              prop.propCategories.push(rec[prop.propid]);
            });
          })
      );
    }
  });
  return Promise.all(promises);
};

let fetchInitialConfig = function () {
  return API.getRequestJSON({
    datatype: 'custom',
    respmodule: 'panoptesserver',
    respid: 'datasetinfo',
    database: dataset
  })
    .then((resp) => {
      if (resp.needfullreload)
        console.log("Schema full reload");
      if (resp.needconfigreload)
        console.log("Schema config reload");
      initialConfig.isManager = resp.manager;
    })
    .then(() => Promise.all(
      [
        API.pageQuery({
          database: dataset,
          table: 'chromosomes',
          columns: {id: 'ST', len: 'ST'}
        })
          .then(data => fetchedConfig.chromosomes = data),
        API.pageQuery({
          database: dataset,
          table: 'tablecatalog',
          columns: columnSpec(['id', 'name', 'primkey', 'IsPositionOnGenome', 'defaultQuery', 'settings']),
          order: 'ordr'
        })
          .then(data => fetchedConfig.tableCatalog = data),
        API.pageQuery({
          database: dataset,
          table: 'customdatacatalog',
          columns: columnSpec(['tableid', 'sourceid', 'settings']),
          order: 'tableid'
        })
          .then(data => fetchedConfig.customDataCatalog = data),
        API.pageQuery({
          database: dataset,
          table: '2D_tablecatalog',
          columns: columnSpec(['id', 'name', 'col_table', 'row_table', 'first_dimension', 'settings']),
          order: 'ordr'
        })
          .then(data => fetchedConfig.twoDTableCatalog = data),
        API.pageQuery({
          database: dataset,
          table: 'settings',
          columns: columnSpec(['id', 'content']),
          order: 'id'
        })
          .then(data => {
            fetchedConfig.generalSettings = {};
            _.each(data, function (sett) {
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
          .then(data => fetchedConfig.graphs = data),
        API.pageQuery({
          database: dataset,
          table: 'propertycatalog',
          columns: columnSpec(['propid', 'datatype', 'tableid', 'source', 'name', 'settings']),
          order: 'ordr',
          query: SQL.WhereClause.OR([
            SQL.WhereClause.CompareFixed('workspaceid', '=', workspace),
            SQL.WhereClause.CompareFixed('workspaceid', '=', '')])
        })
          .then(data => fetchedConfig.customProperties = data),
        API.pageQuery({
          database: dataset,
          table: '2D_propertycatalog',
          columns: columnSpec(['id', 'tableid', 'col_table', 'row_table', 'name', 'dtype', 'settings']),
          order: 'ordr'
        })
          .then(data => fetchedConfig.twoDProperties = data),
        API.pageQuery({
          database: dataset,
          table: 'summaryvalues',
          columns: columnSpec(['propid', 'name', 'minval', 'maxval', 'minblocksize', 'tableid', 'settings']),
          order: 'ordr',
          query: SQL.WhereClause.AND([
            SQL.WhereClause.OR([
              SQL.WhereClause.CompareFixed('workspaceid', '=', workspace),
              SQL.WhereClause.CompareFixed('workspaceid', '=', '')]),
            SQL.WhereClause.CompareFixed('tableid', '<>', '')
          ])

        })
          .then(data => fetchedConfig.summaryValues = data),
        API.pageQuery({
          database: dataset,
          table: 'tablebasedsummaryvalues',
          columns: columnSpec(['tableid', 'trackid', 'trackname', 'minval', 'maxval', 'minblocksize', 'settings']),
          order: 'ordr'
        })
          .then(data => fetchedConfig.tableBasedSummaryValues = data),
        API.pageQuery({
          database: dataset,
          table: 'relations',
          columns: columnSpec(['childtableid', 'childpropid', 'parenttableid', 'parentpropid', 'forwardname', 'reversename']),
          order: 'childtableid'
        })
          .then(data => fetchedConfig.relations = data),
        API.pageQuery({
          database: dataset,
          table: 'externallinks',
          columns: columnSpec(['linktype', 'linkname', 'linkurl']),
          order: 'linkname'
        })
          .then(data => fetchedConfig.relations = data)
      ]
    ))
    .then(() => {
      fetchedConfig.mapTableCatalog = {};
      _.each(fetchedConfig.tableCatalog, function (table) {
        parseTableSettings(table);
        mapExtraTableSettings(table, fetchedConfig.customDataCatalog);
        augmentTableInfo(table);
        fetchedConfig.mapTableCatalog[table.id] = table;
      });
      fetchedConfig.map2DTableCatalog = {};
      _.each(fetchedConfig.twoDTableCatalog, function (table) {
        augment2DTableInfo(table);
        fetchedConfig.map2DTableCatalog[table.id] = table;
      });
      //parse graph info
      _.each(fetchedConfig.tableCatalog, function (tableInfo) {
        tableInfo.trees = [];
      });
      _.each(fetchedConfig.graphs, function (graphInfo) {
        if (graphInfo.tpe == 'tree') {
          fetchedConfig.mapTableCatalog[graphInfo.tableid].trees.push({
            id: graphInfo.graphid,
            name: graphInfo.dispname,
            crossLink: graphInfo.crosslnk
          });
        }
      });
      parseSummaryValues();
    })
  .then(parseCustomProperties)
  //.then(() => {
      //parse2DProperties();
      //parseTableBasedSummaryValues();
      //parseRelations();
      //parseStoredSubsets();
    //});
  .then(() => {
      return _.extend(initialConfig, {
        user: {
          id: initialConfig.userID,
          isManager: initialConfig.isManager
        },

        chromosomes: fetchedConfig.chromosomes,
        tables: fetchedConfig.mapTableCatalog,
        settings: fetchedConfig.generalSettings
      })
    });
};

module.exports = fetchInitialConfig;
