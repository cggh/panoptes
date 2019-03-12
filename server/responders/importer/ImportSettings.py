# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import absolute_import

from builtins import str
from past.builtins import basestring
from builtins import object
import uuid

import os

import yaml
import copy
from collections import OrderedDict
import simplejson
import abc
from abc import ABCMeta
import ruamel.yaml
import portalocker
from future.utils import with_metaclass

valueTypes = ['Float', 'Double', 'Int8', 'Int16', 'Int32', 'Date', 'GeoLatitude', 'GeoLongitude']

class ImportSettings(with_metaclass(ABCMeta, object)):

    _propertiesDefault = OrderedDict((
                            ('id', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Identifier of the property, equal to the corresponding column header in the TAB-delimited source file ``data``'
                                   }),
                            ('dataType', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Data type of the values in the property. Absent values can be coded by an empty string.',
                                   'values':  OrderedDict((
                                                ('Text', {
                                                     'description': 'text strings'
                                                     }),
                                               ('Float', {
                                                     'description': '32 bit floating point approximate number'
                                                     }),
                                               ('Double', {
                                                     'description': '64 bit floating point approximate number'
                                                     }),
                                               ('Boolean', {
                                                     'description': 'True/False binary states. Possible values 0,1,true,false'
                                                     }),
                                               ('Int8', {
                                                   'description': '8 bit signed integer between -127 and 127'
                                                      }),
                                               ('Int16', {
                                                   'description': '16 bit signed integer between -32767 and 32767'
                                                      }),
                                               ('Int32', {
                                                   'description': '32 bit signed integer between -2147483647 and 2147483647'
                                                      }),
                                               ('GeoLatitude', {
                                                    'description': 'latitude part of a geographical coordinates (in decimal degrees).'
                                                      }),
                                               ('GeoLongitude', {
                                                    'description': 'longitude part of a geographical coordinates (in decimal degrees).'
                                                      }),
                                               ('Date', {
                                                    'description': 'calendar dates, ISO formatted (i.e. YYYY-MM-DD).'
                                                      }),
                                               ('GeoJSON', {
                                                    'description': 'GeoJSON, i.e. http://geojson.org/'
                                                      })
                                             ))
                                          }),
                            ('name', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Display name of the property'
                                   }),
                            ('description', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'Brief description of the property.\n  This will appear in hover tool tips and in the popup box if a user clicks a property info button'
                                   }),
                            ('groupId', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'Id of the Property group this property belongs to'
                                   }),
                            ('externalUrl', {
                                             'type': 'Text',
                                             'required': False,
                                             'description': '''A url that should be opened when the user clicks on a value of this property. The url should
  be formatted as a template, with ``{value}`` interpolated to the property value.
  For example: ``http://www.ebi.ac.uk/ena/data/view/{value}``'''
                                             }),
                            ('isCategorical', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'Instructs Panoptes to treat the property as a categorical variable.\n  For example, a combo box with the possible states is automatically shown in queries for this property.\n When isCategorical is not set and the property has fewer than 50 distinct values and the dataType is not GeoJSON, then isCategorical is automatically set to True. \n'
                                   }),
                            ('valueColours', {
                                   'type': 'Block',
                                   'required': False,
                                   'description': 'Specifies display colours for specific values of this property.\n  Each key in the block links a possible value of the property to a color (example: ``Accepted: rgb(0,192,0)``).\n  The special value ``_other_`` can be used to specify a color for all other property values that are not listed explicitly'
                                   }),
                            ('scaleColours', {
                                'type': 'Block',
                                'required': False,
                                'default' : {'thresholds':None, 'colours': ['#2ca02c', '#d62728'], 'interpolate': True, 'nullColour': 'rgba(0,0,0,0)'},
                                'description': 'For value types specifies colours to represent the value in graphical elements',
                                'children': OrderedDict((
                                    ('thresholds', {
                                        'type': 'List',
                                        'required': True,
                                        'default': None,
                                        'description': 'A list of values that split the range into colours, if unspecifed defaults to [minVal, maxVal]'
                                    }),
                                    ('colours', {
                                        'type': 'List',
                                        'required': True,
                                        'default': ['#2ca02c', '#d62728'],
                                        'description': "A list of colours (HTML compatible) this list should be same length as the thresholds if interpolation is true and one shorter if it is not, a value of '...' will make a colour between it's neighbours."
                                    }),
                                    ('nullColour', {
                                        'type': 'Text',
                                        'required': False,
                                        'default': 'rgba(0,0,0,0)',
                                        'description': 'Colour for NULL values'
                                    }),
                                    ('interpolate', {
                                        'type': 'Boolean',
                                        'required': False,
                                        'default': True,
                                        'description': 'If true the colours are smoothed between values'
                                    })
                                ))
                            }),
                            ('valueDescriptions', {
                                'type': 'Block',
                                    'required': False,
                                    'description': 'Specifies descriptions for specific values of this property which will displayed next to it under an info icon.'
                            }),
                            ('valueDisplays', {
                                    'type': 'Block',
                                    'required': False,
                                    'description': 'Specifies display html for specific values of this property. The html will replace this value when it is displayed'
                            }),
                            ('defaultWidth', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'Sets the default column width in pixels.',
                                   }),
                            ('showBar', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'Draws a bar in the background of the table, indicating the value.\n  Requires *minVal* & *maxVal* to be defined.',
                                   'siblingOptional': { 'name': 'dataType', 'value': valueTypes}
                                   }),
                            ('showBackgroundColour', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'Paints a colour in the background of the table cell, indicating the value.\n  Requires *minVal* & *maxVal* to be defined.',
                                   'siblingOptional': { 'name': 'dataType', 'value': valueTypes}
                                   }),
                            ('minVal', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'Set automatically from data unless overridden. For *Value* types, lower extent of scale',
                                   'siblingOptional': { 'name': 'dataType', 'value': valueTypes}
                                   }),
                            ('maxVal', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'Set automatically from data unless overridden. For *Value* types, upper extent of scale',
                                   'siblingOptional': { 'name': 'dataType', 'value': valueTypes}
                                   }),
                            ('pc90Len', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'Set automatically from data unless overridden. For non-*Value* types, the 90th percentile character-length.',
                                   }),
                            ('decimDigits', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'For *Value* types, specifies the number of decimal digits used to display the value',
                                   'siblingOptional': { 'name': 'dataType', 'value': valueTypes}
                                   }),
                            ('index', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': 'If set, instructs Panoptes to create an index for this property in the relational database.\n  For large datasets, this massively speeds up queries and sort commands based on this property'
                                   }),
                            ('search', {
                                   'type': 'Text',
                                   'required': False,
                                   'default': 'None',
                                   'description': 'Indicates that this field can be used for text search in the find data item wizard',
                                   'values':  OrderedDict((( 'None', {
                                                         'description': ''
                                                         }),
                                                ('Match', {
                                                     'description': 'only exact matched are searched for'
                                                     }),
                                                ('StartPattern', {
                                                     'description': 'searches all text that starts with the string typed by the user'
                                                     }),
                                                ('Pattern', {
                                                     'description': 'searches all text that contains the string typed by the user'
                                                     })
                                               ))
                                      }),
                            ('relation', {
                                   'type': 'Block',
                                   'required': False,
                                   'description': 'Defines a many-to-one foreign relation to a parent data table.\n  The parent table should contain a property with the same name as the primary key property in the child table',
                                   'children': OrderedDict((( 'tableId', {
                                                             'type': 'DatatableID',
                                                             'required': True,
                                                             'description': 'Data table ID of the relation parent table'
                                                             }),
                                                ('forwardName', {
                                                                'type': 'Text',
                                                                'required': True,
                                                                'default': 'belongs to',
                                                                'description': 'Display name of the relation from child to parent'
                                                                }),
                                                ('reverseName', {
                                                                'type': 'Text',
                                                                'required': True,
                                                                'default': 'has',
                                                                'description': 'Display name of the relation from parent to child'
                                                                })
                                                ))
                                   }),
                            ('showInTable', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': True,
                                   'description': 'If set to false this property will not be available to be shown in tables in the application'
                                   }),
                            ('showInBrowser', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': True,
                                   'description': 'If set, this property will automatically appear as a track in the genome browser\n  (only applies if *IsPositionOnGenome* is specified in database settings)'
                                   }),
                            ('tableDefaultVisible', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': True,
                                   'description': 'If set to true (default) then this property will appear in tables when they are first shown'
                                   }),
                            ('browserDefaultVisible', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'Indicates that the track will activated by default in the genome browser ',
                                   'siblingOptional': { 'name': 'showInBrowser', 'value': True}
                                   }),
                            ('browserShowOnTop', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'Indicates that the track will be shown in the top (non-scrolling) area of the genome browser.\n  In this case, it will always be visible ',
                                   'siblingOptional': { 'name': 'showInBrowser', 'value': True}
                                   }),
                            ('colour', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'Colour used to display this property. Formatted as ``"rgb(r,g,b)"`` or ``"#HHHHHH"``\n  ',
                                   }),
                            ('hideLink', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': "Don't show a link for this column if one would usually be shown (related properties etc.)",
                                   }),

                            ('defaultVisible', {
                                                'type': 'Boolean',
                                                'required': False,
                                                'default': True,
                                                'description': ''
                                                }),

                          ))


    def __init__(self, fileName = None, log = True, validate = True):
        self._logLevel = log

        self.loadFile(fileName, validate)

    def __str__(self):
        return str(self._propidMap)

    def _log(self, message):
        if (self._logLevel):
            print(message)

    def loadFile(self, fileName, validate = True):
        if fileName is not None:
            self.fileName = fileName
            if self._logLevel:
                self._log('Loading settings from: '+fileName)

            with open(self.fileName, 'r') as configfile:
                try:
                    text = configfile.read()
                    self._settings = yaml.load(text) or {}
                    if type(self._settings) != dict:
                        raise Exception("YAML contains only a string - should be dict with keys and values")

                except Exception as e:
                    print('ERROR: yaml parsing error: ' + str(e))
                    raise Exception('Error while parsing yaml file {0}'.format(fileName))

            try:
                if self._logLevel:
                    self._log('Loading settings from: '+fileName)

                with open(self.fileName+'.local', 'r') as configfile:
                    try:
                        text = configfile.read()
                        local_settings = yaml.load(text) or {}
                        if type(local_settings) != dict:
                            raise Exception("YAML contains only a string - should be dict with keys and values")

                    except Exception as e:
                        print('ERROR: yaml parsing error: ' + str(e))
                        raise Exception('Error while parsing yaml file {0}'.format(fileName+'.local'))
                self._settings.update(local_settings)
            except FileNotFoundError:
                pass


            self._load(validate)
#            if self._logLevel:
#                self._log('Settings: '+str(self._settings))
        else:
            self.fileName = ''
            self._settings = {}




    def loadProps(self, props, validate = True):

        if props is None:
            return

        self._settings.update(copy.deepcopy(props))
        self._load(validate)


    def _addDefaultProperties(self):
        if ('primKey' in self._settings and (self._settings['primKey'] == 'AutoKey')):
            propid = 'AutoKey'
            self._propidMap[propid] = {
                                          'id': propid,
                                          'name': propid,
                                          'dataType': 'Int32',
                                          'decimDigits': 0
                                          }

    def _setDefaultValues(self):

        for key in self._propidMap:
            values = self._propidMap[key]
            if 'isCategorical' in values and values['isCategorical']:
                self._propidMap[key]['index'] = True
            if 'relation' in values and values['relation']:
                self._propidMap[key]['index'] = True
            if 'search' in values and values['search'] in ['StartPattern', 'Pattern', 'Match']:
                self._propidMap[key]['index'] = True # Use index to speed up search

        if 'sortDefault' in self._settings:
            sd = self._settings['sortDefault']
            if sd in self._propidMap:
                self._propidMap[sd]['index'] = True


    def _checkSiblingRequired(self, testDict, pkey, srdef, siblings):

        message = None

        siblingValue = srdef['value']
        siblingName = srdef['name']
        if testDict[siblingName] != siblingValue:
            if pkey in testDict:
                message = "{} Wrong value for {} (expected {} got {}) for {}\n".format(pkey, siblingName, siblingValue, testDict[siblingName], str(testDict)[:100])
        else:
            if testDict[siblingName] == siblingValue and not pkey in testDict:
                message = "Missing required value {} for {} because {} == {}\n".format(pkey, str(testDict)[:100], siblingName, siblingValue)

        return message

    def _checkSettingRequired(self, testDict, pkey, srdef):
        settingValue = srdef['value']
        settingName = srdef['name']

        if (settingName in self._settings and self[settingName] == settingValue):
            if not pkey in testDict:
                self._errors.append("Missing required value {} for {}\n".format(pkey, str(testDict)[:100]))


    def _hasOptionalSibling(self, testDict, pkey, pdef):
        ret = False

        sibName = pdef['siblingOptional']['name']
        sibValue = pdef['siblingOptional']['value']
        for valkey in testDict:
            val = testDict[valkey]
            if valkey == sibName:
                ret = True
                if type(sibValue) == str and val != sibValue:
                    ret = False
                    self._errors.append("Wrong sibling value for {} ({})\n (expected {} {}, got {} {}) for {}\n".format(sibName, pkey, sibValue, type(sibValue), val, type(val), str(testDict)[:100]))
                if type(sibValue) == list and val not in sibValue:
                    ret = False
                    self._errors.append("Wrong sibling value for {} ({})\n (expected {} {}, got {} {}) for {}\n".format(sibName, pkey, sibValue, type(sibValue), val, type(val), str(testDict)[:100]))
        return ret

    def _checkProperty(self, testDict, pkey, pdef, siblings = None):

        #print("Checking {} {}".format(str(testDict), str(pdef)))
        if pdef['type'] == 'documentation':
            return

        #print "Checking property {} {} {}".format(str(testDict), pkey, pdef)
        if 'required' in pdef and pdef['required']:
            if not pkey in testDict:
                #This is so common it's fudged...
                if pkey == 'name' and 'id' in testDict:
                    testDict['name'] = testDict['id']
                else:
                    self._errors.append("Missing required value {} for {}\n".format(pkey, str(testDict)[:100]))
                #print "Missing failed - Checking {} for {} using {}".format(str(testDict),pkey,str(pdef))


        if 'children' in pdef and pkey in testDict:
            pcvalues = pdef['children']
            for pckey in pcvalues:
                if type(testDict[pkey]) == list:
                    for val in testDict[pkey]:
                        self._checkProperty(val, pckey, pcvalues[pckey], testDict[pkey])
                else:
                    self._checkProperty(testDict[pkey], pckey, pcvalues[pckey])

        if pkey in testDict:
            value = testDict[pkey]

            #Check enumerated values
            if 'values' in pdef and ('allowOtherValues' not in pdef or not pdef['allowOtherValues']):
                if value not in pdef['values']:
                    self._errors.append("Invalid value {} for key {}\n".format(value, pkey))

        #Make sure Booleans are bool
            if pdef['type'] == 'Boolean':
                if not type(value) is bool:
                    self._errors.append("{} must be a boolean is {} ({})\n".format(pkey,type(value),value))
            elif pdef['type'] == 'Block':
                if not type(value) is dict:
                    self._errors.append("{} must be a block is {}\n".format(pkey, value))
            elif pdef['type'] == 'List':
                if not type(value) is list:
                    self._errors.append("{} must be a List is {}\n".format(pkey, value))
            elif pdef['type'] == 'Value':
                if not (type(value) is int or type(value) is float):
                    self._errors.append("{} must be a Value is {}\n".format(pkey, value))
            elif pdef['type'] == 'Text' or pdef['type'] == 'DatatableID':
                if not (type(value) is str or type(value) is str):
                    self._errors.append("{} must be a str is {}\n".format(pkey, value))
            elif pdef['type'] == 'Text or List':
                if not (type(value) is str or type(value) is list):
                    self._errors.append("{} must be Text or List is {}\n".format(pkey, value))
            elif pdef['type'] == 'PropertyID':
                if not (value in self._propidMap or (pkey == 'primKey' and value == 'AutoKey') or value == 'None' or ('autoScanProperties' in self._settings and self._settings["autoScanProperties"])):
                    self._errors.append("{} must be a valid PropertyId is {}\n".format(pkey, value))
            elif pdef['type'] == 'PropertyIDs':
                pass
                for propid in value.split(','):
                    propid = propid.strip()
                    if not (propid in self._propidMap or '@' in propid):
                        self._errors.append("{} must be a valid PropertyId is {}\n".format(pkey, propid))
            elif pdef['type'] == 'PropertyIDList':
                pass
                if not type(value) is list:
                    self._errors.append("{} must be a List is {}".format(pkey, value))
                for propid in value:
                    if not (propid in self._propidMap or '@' in propid):
                        self._errors.append("{} must be a valid PropertyId is {}\n".format(pkey, propid))
            else:
                #Error in definition above
                self._errors.append("Undefined type {} for {}\n".format(pdef['type'], pkey))

        if 'siblingOptional' in pdef:
            if siblings and pkey in testDict:
                self._hasOptionalSibling(testDict, pkey, pdef)

        if 'siblingRequired' in pdef:
            if type(pdef['siblingRequired']) == list:
                valid = False
                options = []
                #List is OR
                for srdef in pdef['siblingRequired']:
                    msg = self._checkSiblingRequired(testDict, pkey, srdef, siblings)
                    if msg == None:
                        valid = True
                    else:
                        options.append(msg)
                if not valid:
                    self._errors.append("When " + pkey + " one of following must be set " + ",".join([x['name'] + "=" + x['value'] for x in pdef['siblingRequired']]) + " for " + str(testDict)[:100] + '\n')

            else:
                msg = self._checkSiblingRequired(testDict, pkey, pdef['siblingRequired'], siblings)
                if msg:
                    self._errors.append(msg)

        if 'settingRequired' in pdef:
            if type(pdef['settingRequired']) == list:
                for srdef in pdef['settingRequired']:
                    self._checkSettingRequired(testDict, pkey, srdef)
            else:
                self._checkSettingRequired(testDict, pkey, pdef['settingRequired'])

    def _validate(self, toValidate, definition):

        if type(toValidate) == list:
            for item in toValidate:
                self._validate(item, definition)
        elif type(toValidate) == dict:
            for key in toValidate:

                value = toValidate[key]

                if key not in definition:
                    self._errors.append("Unknown property key {} in {}\n".format(key, str(toValidate)[:100]))
                    continue

                defn = definition[key]

                if 'children' in defn:
                    self._validate(value, defn["children"])
                elif key in definition:
                    if type(value) == dict:
                        self._checkProperty(value, key, defn)
                else:
                    self._errors.append("Unknown configuration item: {}\n".format(key))

        if type(definition) == list:
            for item in definition:
                self._validate(toValidate, item)
        elif type(definition) == dict or isinstance(definition,OrderedDict):
            for key in definition:
                value = definition[key]
                #print "Checking defns {} {} {}".format(str(toValidate), key, value)
                if type(toValidate) == list:
                    for item in toValidate:
                        self._checkProperty(item, key, value)
                else:
                    self._checkProperty(toValidate, key, value)
        else:
            print ("definition not a list or dict" + str(type(definition)))


    def _mergeProperties(self):
        if 'properties' in self._settings:
            if not type(self._settings['properties']) is list:
                raise Exception('Properties token should be a list')
            for propSource in self._settings['properties']:
                if 'id' not in propSource:
                    raise Exception('Property is missing Id field')
                propids = propSource['id']
                if not (isinstance(propids, basestring)):
                    raise Exception('Property has invalid Id field: ' + str(propids)) #Merge sections with the same Id
                for propid in propids.split(','):
                    propid = propid.strip()
                    try:
                        if not propid in self._propidMap:
                            properties = {}
                            self._propidMap[propid] = properties
                        self._propidMap[propid].update(copy.deepcopy(propSource))
                        self._propidMap[propid]['id'] = propid
                    except Exception as e:
                        raise Exception('Invalid property "{0}": {1}'.format(propid, str(e)))

            #Now we need to update the original so it can be validated
            propsList = copy.deepcopy(self._settings["properties"])
            copied = set()
            #Do it backwards so can deleted without changing the index
            for i, propDetails in reversed(list(enumerate(propsList))):
                propid = propDetails['id']
                if propid in self._propidMap and propid not in copied:
                    self._settings['properties'][i] = copy.deepcopy(self._propidMap[propid])
                    copied.add(propid)
                else:
                    del self._settings['properties'][i]
            #Add entries for those props only referenced in a list.
            for propid, propDetails in list(self._propidMap.items()):
                if propid not in copied:
                    self._settings['properties'].append(propDetails)

    #Set any implied values here
    def _postProcess(self):
        pass

    @abc.abstractmethod
    def getSettings(self):
        '''The getSettings method should return an OrderedDict describing the configuration'''
        return

    def getLoadedSettings(self):
        return self._settings

    def _load(self, validate = True):

        self._propidMap = OrderedDict()
        self._errors = []

        self._addDefaultProperties()

        self._mergeProperties()

        self._setDefaultValues()

        self._settingsDef = self.getSettings()

        if validate:
            self._validate(self._settings, self._settingsDef)

        self._postProcess()

        if len(self._errors) > 0:
            raise ValueError(self.__class__.__name__ + ":" + ";".join(self._errors))

    def _prepareSerialization(self, settings, defn):
        tosave = copy.deepcopy(settings)
        def setDefaults(subSettings, subDefn):
            for key, value in list(subDefn.items()):
                if 'default' in value:
                    includeDefault = True
                    if 'siblingOptional' in value:
                        if not self._hasOptionalSibling(subSettings, key, value):
                            includeDefault = False
                    if includeDefault:
                        subSettings[key] = subSettings.get(key, value['default'])
                if 'children' in value and key in subSettings:
                    if value['type'] == 'List':
                        for child in subSettings[key]:
                            setDefaults(child, value['children'])
                    elif value['type'] == 'Block':
                        setDefaults(subSettings[key], value['children'])
        setDefaults(tosave, defn)

        return simplejson.dumps(tosave)

    #For putting down the wire
    def serialize(self):

        return self._prepareSerialization(self._settings, self._settingsDef)

    #Used to pick up table settings from the db
    def deserialize(self, settings):

        parsed = simplejson.loads(settings, strict=False)
        #Have to not validate as stuff has been deleted when serializing
        #Can't just remove from _settingsDef and Properties are missing
        self.loadProps(parsed, False)

    def getPropertyNames(self):
        return list(self._propidMap.keys())

    def updateAndWriteBack(self, action, updatePath, newConfig, validate=True):
        if action not in ['replace', 'merge', 'delete']:
            raise ValueError("Action must be one of 'replace', 'merge', 'delete'")

        def updateConfig(settings):
            if len(updatePath) > 0:
                def emptyValueFor(settingsDef):
                    type = settingsDef['type']
                    if type == 'List':
                        return settingsDef.get('default', [])
                    elif type == 'Block':
                        return settingsDef.get('default', {})

                updatePoint = settings
                updatePointSettings = self._settingsDef
                #First recursively navigate to the level above the update point - note that we follow the path inserting if we need to
                for key in updatePath[:-1]:
                    if isinstance(updatePoint, dict):
                        updatePoint = updatePoint.setdefault(key, emptyValueFor(updatePointSettings[key]))
                        updatePointSettings = updatePointSettings[key].get('children', {})
                    elif isinstance(updatePoint, list):
                        updatePoint = updatePoint[int(key)]
                        # print (updatePointSettings['name'])
                        # updatePointSettings = updatePointSettings[key].get('children', {})
                    else:
                        raise ValueError("Bad key in path:"+key)

                #We're one level above, the final behaviour depends on the type of this level and the action
                key = updatePath[-1]
                actualAction = action
                if isinstance(updatePoint, dict):
                    #If there is nothing to merge into then switch to replace
                    if key not in updatePoint and actualAction == 'merge':
                        actualAction = 'replace'
                elif isinstance(updatePoint, list):
                    key = int(key)

                if actualAction == 'replace':
                    updatePoint[key] = newConfig
                elif actualAction == 'delete':
                    try:
                        del updatePoint[key]
                    except KeyError:
                        pass
                elif actualAction == 'merge':
                    if isinstance(updatePoint[key], dict):
                        if not isinstance(newConfig, dict):
                            raise ValueError("Cannot merge non-dict")
                        updatePoint[key].update(newConfig)
                    elif isinstance(updatePoint[key], list):
                        if not isinstance(newConfig, list):
                            raise ValueError("Cannot append non-list")
                        updatePoint[key] += newConfig
                    else:
                        updatePoint[key] = newConfig
            else:
                if action == 'replace':
                    return newConfig
                elif action == 'delete':
                    raise Exception("Can't delete all config")
                elif action == 'merge':
                    assert(isinstance(newConfig, dict))
                    settings.update(newConfig)
            return settings

        self._settings = updateConfig(self._settings)
        if validate:
            self._validate(self._settings, self._settingsDef)
        if len(self._errors) > 0:
            raise ValueError(self.__class__.__name__ + ":" + ";".join(self._errors))

        #We now write the change to the YAML - we reload as the load on constuction adds defaults etc and strips comments.
        with portalocker.Lock(self.fileName, mode="r", timeout=5) as configfile:
            config = ruamel.yaml.load(configfile.read(), ruamel.yaml.RoundTripLoader)
            config = updateConfig(config)
            tempFileName = self.fileName + '_tmp' + str(uuid.uuid4())
            with open(tempFileName, 'w') as tempfile:
                tempfile.write(ruamel.yaml.dump(config, Dumper=ruamel.yaml.RoundTripDumper))
                tempfile.flush()
                os.fsync(tempfile.fileno())
            os.rename(tempFileName, self.fileName)


    def __getitem__(self, key):

        settings = self._settings

        #So default is used
        if settings is None:
            settings = {}

        if self._settingsDef and key in self._settingsDef and 'default' in self._settingsDef[key]:
            return settings.get(key, self._settingsDef[key]['default'])
        else:
            if key in settings:
                return (settings[key])
            else:
                return None

    def __setitem__(self, key, value):
        if key in self._settingsDef:
            self._settings[key] = value
        else:
            self._settings[key] = value
            #Only a warning as sometimes (e.g. 'hasGenomeBrowser') a value can be set in the code that can't be in the settings
            self._log("Attempting to set an undefined key:" + key)

    def getProperty(self, propid):
        if propid in self._propidMap:
            return self._propidMap[propid]
        else:
            return None

    def getPropertyValue(self, propid, key):

        prop = self.getProperty(propid)
        if key == 'name':
            if key not in prop:
                key = 'id'

        if key in self._settingsDef["properties"]["children"] and 'default' in self._settingsDef["properties"]["children"][key]:
            return prop.get(key, self._settingsDef["properties"]["children"][key]['default'])
        else:
            if key in prop:
                return (prop[key])
            else:
                return None

    def setPropertyValue(self, propid, key, value):
        self._propidMap[propid][key] = value

    def getTableBasedSummaryValue(self, key):
        for defn in self._settings['tableBasedSummaryValues']:
            if defn['id'] == key:
                return defn
        return None

    def _printProperty(self, key, detail, f, indent = ''):

        if detail['type'] == 'documentation':
            print (detail['description'], file = f)
            return

        print(indent + key, file = f)
        line = indent + "  *" + detail['type']
        if 'required' in detail and detail['required']:
            line = line + " (required)"
        if 'siblingRequired' in detail:
            line = line + " (required)"
        if not 'description' in detail:
            print ("Missing description for {}".format(key))
        line = line + ".* "
        if 'default' in detail:
            line = line + " Default:" + str (detail['default']) + ".  "
        line = line + detail['description']
        if 'siblingOptional' in detail:
            line = line + "(only applies if *" + detail['siblingOptional']['name'] + "* is " + str(detail['siblingOptional']['value']) + ")"
        if 'siblingRequired' in detail:
            if type(detail['siblingRequired']) == list:
                line = line + "(only applies if one of the following is true:"
                for sr in detail['siblingRequired']:
                    line = line + "(*" + sr['name'] + "* is " + str(sr['value']) + ")"
                line = line + ")"

            else:
                line = line + "(only applies if *" + detail['siblingRequired']['name'] + "* is " + str(detail['siblingRequired']['value']) + ")"
        print(line + ".", file = f)
        if 'values' in detail:
            print(indent + "  Possible values:", file = f)
            print('', file = f)
            for val in detail['values']:
                if not 'description' in detail['values'][val]:
                    print ("Missing description for {}".format(val))
                print(indent + "  - ``" + val + "``: " + detail['values'][val]['description'] + ".", file = f)
        if 'children' in detail:
            print(indent + "  The block can contain the following keys:", file = f)
            for val in detail['children']:
                self._printProperty(val, detail['children'][val], f, '    ')
        print('', file = f)

    def _getDocFilename(self):
        return ""

    def _getDocHeader(self):
        return ""

    def _getDocFooter(self):
        return ""

    def _getDocSettings(self):
        return self.getSettings()

    def generateDocs(self):

        #This will be done several times but I don't think that really matters....
        f = open('documentation/importdata/importsettings/datatable_properties.rst', 'w')
        print('''.. _def-settings-datatable-properties:

Datatable property settings
^^^^^^^^^^^^^^^^^^^^^^^^^^^
An overview of the possible keys than can be defined for an individual property in
the *Properties* block of the data table settings.
''', file = f)
        for key in self._propertiesDefault:
            detail = self._propertiesDefault[key]
            self._printProperty(key, detail, f)
        f.close()

        #This does the work
        f = open(self._getDocFilename(), 'w')
        print (self._getDocHeader(), file = f)
        settings = self._getDocSettings()
        for key in settings:
            detail = settings[key]
            self._printProperty(key, detail, f)

        print (self._getDocFooter(), file = f)
        f.close()

if __name__ == '__main__':

    from .Settings2Dtable import Settings2Dtable
    from .SettingsRefGenome import SettingsRefGenome
    from .SettingsDataTable import SettingsDataTable
    from .SettingsDataset import SettingsDataset
    from .SettingsGraph import SettingsGraph

    #Settings Global is the same as dataset so no need to generateDocs

    settings = Settings2Dtable()
    settings.generateDocs()

    settings = SettingsRefGenome()
    settings.generateDocs()

    settings = SettingsDataTable()
    settings.generateDocs()

    settings = SettingsDataset()
    settings.generateDocs()

    settings = SettingsGraph()
    settings.generateDocs()
