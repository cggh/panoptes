const _ = require('lodash');
const React = require('react');
const Fluxxor = require('fluxxor');
const Panoptes = require('components/Panoptes.js');

const LayoutStore = require('stores/LayoutStore');
const PanoptesStore = require('stores/PanoptesStore');

const LayoutActions = require('actions/LayoutActions');
const PanoptesActions = require('actions/PanoptesActions');
const APIActions = require('actions/APIActions');

const API = require('panoptes/API');
const SQL = require('panoptes/SQL');

/////////////THIS BIT SHOULD REALLY HAPPEN ON SERVER!!!!
let dataset = initialConfig.dataset;

function columnSpec(list) {
  let ret = {}
  _.each(list, (item) => ret[item] = 'ST');
  return ret;
}

let parseTableSettings = function(table) {
  //TODO Default should be at import level
  let settings = { GenomeMaxViewportSizeX:50000 };
  if (table.settings) {
    //FIXME We need a proper escaping of the json
    table.settings = table.settings.replace(/`/g, '\\"');
    table.settings = table.settings.replace(/\n/g, "\\n");
    settings = _.extend(settings,JSON.parse(table.settings));
  }
  table.settings = settings;
}

let mapExtraTableSettings = function(tableInfo, customDataCatalog) {
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
}

let augmentTableInfo = function(table) {
  table.hasGenomePositions = table.IsPositionOnGenome=='1';
  if (table.defaultQuery != '')
    table.defaultQuery = SQL.WhereClause.decode(table.defaultQuery);
  else
    table.defaultQuery = SQL.WhereClause.Trivial();
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
  table.propertyGroups = [];
  table.propertyGroupMap = {};
  if (table.settings.PropertyGroups) {
    _.each(table.settings.PropertyGroups, function(groupInfo) {
      groupInfo.properties = [];
      table.propertyGroups.push(groupInfo);
      table.propertyGroupMap[groupInfo.Id] = groupInfo;
    });
  }
}

let augment2DTableInfo = function(table) {
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
    settings = _.extend(settings,JSON.parse(table.settings));
  settings.GenomeMaxViewportSizeX = parseInt(settings.GenomeMaxViewportSizeX);
  table.settings = settings;
};

API.getRequestJSON({
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
        .then(data => initialConfig.chromosomes = data),
      API.pageQuery({
        database: dataset,
        table: 'tablecatalog',
        columns: columnSpec(['id', 'name', 'primkey', 'IsPositionOnGenome', 'defaultQuery', 'settings']),
        order: 'ordr'
      })
        .then(data => initialConfig.tableCatalog = data),
      API.pageQuery({
        database: dataset,
        table: 'customdatacatalog',
        columns: columnSpec(['tableid', 'sourceid', 'settings']),
        order: 'tableid'
      })
        .then(data => initialConfig.customDataCatalog = data),
      API.pageQuery({
        database: dataset,
        table: '2D_tablecatalog',
        columns: columnSpec(['id', 'name', 'col_table', 'row_table', 'first_dimension', 'settings']),
        order: 'ordr'
      })
        .then(data => initialConfig.twoDTableCatalog = data),
      API.pageQuery({
        database: dataset,
        table: 'settings',
        columns: columnSpec(['id', 'content']),
        order: 'id'
      })
        .then(data => {
          initialConfig.generalSettings = {}
          _.each(data, function (sett) {
            if (sett.content == 'False')
              sett.content = false;
            if (sett.id == 'IntroSections') {
              sett.content = JSON.parse(sett.content);
            }
            initialConfig.generalSettings[sett.id] = sett.content;
          });
        }),
      API.pageQuery({
        database: dataset,
        table: 'graphs',
        columns: columnSpec(['graphid', 'tableid', 'tpe', 'dispname', 'crosslnk']),
        order: 'graphid'
      })
        .then(data => initialConfig.graphs = data)
    ]
  ))
  .then(() => {
    initialConfig.mapTableCatalog = {};
    _.each(initialConfig.tableCatalog, function(table) {
      parseTableSettings(table);
      mapExtraTableSettings(table, initialConfig.customDataCatalog);
      augmentTableInfo(table);
      initialConfig.mapTableCatalog[table.id] = table;
    });
    initialConfig.map2DTableCatalog = {};
    _.each(initialConfig.twoDTableCatalog, function(table) {
      augment2DTableInfo(table);
      initialConfig.map2DTableCatalog[table.id] = table;
    });
    //parse graph info
    _.each(initialConfig.tableCatalog, function(tableInfo) {
      tableInfo.trees = [];
    });
    _.each(initialConfig.graphs, function(graphInfo) {
      if (graphInfo.tpe=='tree') {
        initialConfig.mapTableCatalog[graphInfo.tableid].trees.push({
          id: graphInfo.graphid,
          name: graphInfo.dispname,
          crossLink: graphInfo.crosslnk
        });
      }
    });

  })
  .then(() => {
    let stores = {
      LayoutStore: new LayoutStore(),
      PanoptesStore: new PanoptesStore(initialConfig)
    };

    let actions = {
      layout: LayoutActions,
      panoptes: PanoptesActions,
      api: APIActions
    };

    let flux = new Fluxxor.Flux(stores, actions);
    React.render(<Panoptes flux={flux}/>, document.getElementById('main'));
  }).done();



