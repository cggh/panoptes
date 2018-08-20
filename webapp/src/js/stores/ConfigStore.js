import {createStore} from 'fluxxor';
import {scaleColour} from 'util/Colours';

import Constants from '../constants/Constants';

const APIConst = Constants.API;

import _forEach from 'lodash.foreach';
import SQL from 'panoptes/SQL';
import _values from 'lodash.values';
import _each from 'lodash.foreach';
import _filter from 'lodash.filter';
import _map from 'lodash.map';
import _sortBy from 'lodash.sortby';
import _keys from 'lodash.keys';
import _cloneDeep from 'lodash.clonedeep';

const ConfigStore = createStore({

  initialize(initConfig) {
    this.state = this.addDerivedConfig(initConfig);
    console.log("Config:", this.state);
    this.state.loadStatus = 'LOADED';
    this.bindActions(
      APIConst.MODIFY_CONFIG, this.modifyConfig,
      APIConst.MODIFY_CONFIG_SUCCESS, this.modifyConfigSuccess,
      APIConst.MODIFY_CONFIG_FAIL, this.modifyConfigFail
    );
  },

  modifyConfig() {
    this.state.loadStatus = 'LOADING';
    this.emit('change');
  },

  modifyConfigSuccess({newConfig}) {
    this.state = {...this.state, ...this.addDerivedConfig(newConfig)};
    this.state.loadStatus = 'LOADED';
    this.emit('change');
  },

  modifyConfigFail({msg}) {
    this.state.loadStatus = 'ERROR';
    this.state.errorMsg = msg;
    this.emit('change');
  },

  getState() {
    return this.state;
  },

  columnSpec(list) {
    let ret = {};
    list.forEach((item) => ret[item] = 'ST');
    return ret;
  },

  addDerivedConfig(newConfig) {
    //These mutating methods were copied across, so just clone rather than fixing them up
    newConfig = _cloneDeep(newConfig);
    this.addTableConfig(newConfig);
    this.addRelationConfig(newConfig);
    this.add2DConfig(newConfig);

    let chromosomes = {};
    _each(_sortBy(_keys(newConfig.chromosomes)), (name) => chromosomes[name] = newConfig.chromosomes[name]);
    newConfig.chromosomes = chromosomes;
    newConfig.constants = newConfig.settings.constants;

    _each(newConfig.feeds, (feed, feedId) => {
      let items = [];
      if (Array.isArray(feed.rss.channel.item)) {
        items = feed.rss.channel.item;
      } else if (feed.rss.channel.item !== undefined) {
        items.push(feed.rss.channel.item);
      } else {
        console.warn('There is no item array or item property in this feed.rss.channel: ', feed.rss.channel);
      }

      let itemsById = {};
      items.forEach((item) => {
        let elements = item.link.split('/');
        let id = elements[elements.length - 2];
        itemsById[id] = item;
      });
      feed.itemsById = itemsById;
    });

    return newConfig;
  },

  add2DConfig(config) {
    config.twoDTables = [];
    _each(config.twoDTablesById, (table, key) => {
      table.id = key;
      config.twoDTables.push(table);
      table.propertiesById = {};
      _each(table.properties, (prop) => table.propertiesById[prop.id] = prop);
    });
  },

  addRelationConfig(config) {
    config.tables.forEach((tableInfo) => {
      tableInfo.relationsChildOf = [];
      tableInfo.relationsParentOf = [];
    });
    config.tables.forEach((childTable) => {
      childTable.properties.forEach((prop) => {
        const relation = prop.relation;
        if (relation) {
          relation.childTable = childTable;
          relation.parentTable = config.tablesById[relation.tableId];
          relation.childPropId = prop.id;
          relation.childTable.relationsChildOf.push(relation);
          relation.parentTable.relationsParentOf.push(relation);
        }
      });
    });
    return config;
  },

  addTableConfig(config) {
    config.tables = _values(config.tablesById);
    _forEach(config.tablesById, (table, id) => table.id = id);
    if (config.settings.dataTables) {
      config.tables = [];
      config.settings.dataTables.forEach((id) => {
        config.tables.push(config.tablesById[id]);
      });
      config.visibleTables = _filter(config.tables, (table) => !table.isHidden);
    }
    config.cachedTablesByPrimKey = {};
    let processTable = (table) => {
      if (table.primKey === 'AutoKey') {
        table.properties.unshift({id: 'AutoKey', name: 'AutoKey', dataType: 'Int32'});
      }
      table.hasGenomePositions = table.isPositionOnGenome == '1';
      table.nameSingle = table.nameSingle || table.name;
      table.namePlural = table.namePlural || table.name;
      table.capNameSingle = table.nameSingle.charAt(0).toUpperCase() + table.nameSingle.slice(1);
      table.capNamePlural = table.namePlural.charAt(0).toUpperCase() + table.namePlural.slice(1);
      table.quickFindFields = table.quickFindFields ? _map(table.quickFindFields.split(','), (s) => s.trim()) : [table.primKey];
      table.previewProperties = table.previewProperties ? _map(table.previewProperties.split(','), (s) => s.trim()) : null;
      //TODO Remove the fa here for now - should be in settings
      if (table.icon && table.icon.indexOf(':') === -1)
        table.icon = table.icon.substring(3);
      table.icon = table.icon || 'table';
      table.propertyGroupsById = {};
      table.propertyGroups.forEach((group) => {
        table.propertyGroupsById[group.id] = group;
        group.properties = []; //Added later in addPropertyConfig
        group.visibleProperties = []; //Added later in addPropertyConfig
      });
      if (table.defaultQuery === '')
        table.defaultQuery = SQL.nullQuery;
      this.addPropertyConfig(table);
      if (config.cachedTables[table.id]) {
        config.cachedTablesByPrimKey[table.id] = {};
        let pk = config.tablesById[table.id].primKey;
        config.cachedTables[table.id].forEach((row) => {
          config.cachedTablesByPrimKey[table.id][row[pk]] = row;
        })
      }
    };
    config.tables.forEach(processTable);
    return config;
  },

  addPropertyConfig(table) {
    table.properties = table.properties || [];
    table.propertiesById = {};
    table.properties.forEach((prop) => {
      table.propertiesById[prop.id] = prop;
      prop.tableId = table.id;
      if (prop.dataType == 'Text' || prop.dataType == 'GeoJSON')
        prop.isText = true;
      if ((prop.dataType == 'Float') || (prop.dataType == 'Double') || (prop.dataType == 'GeoLongitude') || (prop.dataType == 'GeoLatitude')) {
        prop.isFloat = true;
        prop.decimDigits = prop.decimDigits || 2;
      }
      if ((prop.dataType == 'Int8') || (prop.dataType == 'Int16') || (prop.dataType == 'Int32')) {
        prop.isInt = true;
      }
      if (prop.dataType == 'Boolean')
        prop.isBoolean = true;
      if (prop.dataType == 'Date')
        prop.isDate = true;
      prop.isNumerical = (prop.isFloat || prop.isInt || prop.isDate);
      if (!prop.name) prop.name = prop.id;
      if (prop.isNumerical) {
        prop.minVal = prop.minVal || 0;
        prop.maxVal = prop.maxVal || 1;
      }
      if (prop.dataType == 'GeoLongitude') {
        prop.minVal = prop.minVal || 0;
        prop.maxVal = prop.maxVal || 360;
        prop.decimDigits = prop.decimDigits || 5;
        table.longitude = prop.id;
      }
      if (prop.dataType == 'GeoLatitude') {
        prop.minVal = prop.minVal || -90;
        prop.maxVal = prop.maxVal || 90;
        prop.decimDigits = prop.decimDigits || 5;
        table.latitude = prop.id;
      }
      if (prop.id == table.primKey)
        prop.isPrimKey = true;
      prop.hasValueRange = !!prop.maxVal;

      // Human friendly data type string  - this is legacy and can be removed as all using sites have type info available
      prop.dispDataType = 'Text';
      prop.icon = 'font';
      if (prop.isFloat || prop.isInt) {
        prop.dispDataType = 'Value';
        prop.icon = 'line-chart';
      }
      if (prop.isCategorical) {
        prop.dispDataType = 'Categorical';
        prop.icon = 'bar-chart';
      }
      if (prop.isBoolean) {
        prop.dispDataType = 'Boolean';
        prop.icon = 'check-square-o';
      }
      if (prop.isDate) {
        prop.dispDataType = 'Date';
        prop.icon = 'calendar';
      }
      if (prop.dataType == 'GeoLongitude') {
        prop.dispDataType = 'Longitude';
        prop.icon = 'globe';
      }
      if (prop.dataType == 'GeoLatitude') {
        prop.dispDataType = 'Latitude';
        prop.icon = 'globe';
      }

      //Assign property group
      if (prop.groupId) {
        if (table.propertyGroupsById[prop.groupId]) {
          table.propertyGroupsById[prop.groupId].properties.push(prop);
          if (prop.showInTable) {
            table.propertyGroupsById[prop.groupId].visibleProperties.push(prop);
          }
        }
      } else {
        if (!table.propertyGroupsById['_UNGROUPED_']) {
          table.propertyGroupsById['_UNGROUPED_'] = {
            id: '_UNGROUPED_',
            name: 'Properties',
            properties: [],
            visibleProperties: []
          };
          table.propertyGroups.push(table.propertyGroupsById['_UNGROUPED_']);
        }
        table.propertyGroupsById['_UNGROUPED_'].properties.push(prop);
        if (prop.showInTable) {
          table.propertyGroupsById['_UNGROUPED_'].visibleProperties.push(prop);
        }
      }

      if (prop.isFloat) {
        if (prop.decimDigits == 0)
          prop.isInt = true;
      }

      if (prop.isDate) {
        table.hasDate = true;
      }

      //Set a recommended encoder - legacy from 1.X
      prop.encoding = {
        'Text': 'String',
        'Float': 'FloatH',
        'Double': 'FloatH',
        'Int8': 'Int',
        'Int16': 'Int',
        'Int32': 'Int',
        'Boolean': 'String',
        'GeoLatitude': 'FloatH',
        'GeoLongitude': 'FloatH',
        'Date': 'FloatH',
        'GeoJSON': 'String'
      }[prop.dataType];

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
      prop.alignment = {
        'Text': 'left',
        'Float': 'right',
        'Double': 'right',
        'Int8': 'right',
        'Int16': 'right',
        'Int32': 'right',
        'Boolean': 'center',
        'GeoLatitude': 'right',
        'GeoLongitude': 'right',
        'Date': 'center',
        'GeoJSON': 'left'
      }[prop.dataType];
      prop.description = prop.description || '';
      prop.showBar = prop.showBar || (prop.barWidth > 0);
      prop.showByDefault = 'tableDefaultVisible' in prop ? prop.tableDefaultVisible :
        prop.isPrimKey ||
        prop.id == table.chromosome ||
        prop.id == table.position ||
        false;
      prop.defaultValue = (prop.distinctValues || {})[0] || {
        'Text': '',
        'Float': 0,
        'Double': 0,
        'Int8': 0,
        'Int16': 0,
        'Int32': 0,
        'Boolean': true,
        'GeoLatitude': 0,
        'GeoLongitude': 0,
        'Date': 0,
        'GeoJSON': ''
      }[prop.dataType];
      if (prop.scaleColours) {
        if (!prop.scaleColours.thresholds) {
          prop.scaleColours.thresholds = [prop.minVal, prop.maxVal];
        }

        //Interpolate thresholds where .. has been used.
        let {thresholds, colours, interpolate} = prop.scaleColours;
        if ((colours.length !== thresholds.length && interpolate) || (colours.length !== thresholds.length - 1 && !interpolate)) {
          console.error(`thresholds and colours are incompatible lengths for ${prop.id}`);
        }
        let gaps = [];
        let inGap = false;
        for (let i = 0, l = colours.length; i < l; ++i) {
          if (colours[i] === '...') {
            if (i === 0 || i === l - 1) {
              console.error(`... cannot be used at start or end of colours ${prop.id}`)
            }
            if (!inGap) {
              inGap = true;
              gaps.push({start: i - 1, end: i + 1});
            } else {
              gaps[gaps.length - 1].end = i + 1;
            }
          } else {
            inGap = false;
          }
        }
        for (let i = 0, l = gaps.length; i < l; ++i) {
          let {start, end} = gaps[i];
          let colourFunc = scaleColour([start, end], [colours[start], colours[end]]);
          for (let j = start + 1; j < end; ++j) {
            colours[j] = colourFunc(j);
          }
        }
      }
    });
    table.visibleProperties = _filter(table.properties, (property) => property.showInTable);
    table.hasGeoCoord = !!(table.longitude && table.latitude);
  }

});

export default ConfigStore;
