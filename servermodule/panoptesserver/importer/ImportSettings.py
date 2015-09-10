# -*- coding: utf-8 -*-
from __future__ import print_function
import yaml
import copy
from collections import OrderedDict
import simplejson
import abc
from abc import ABCMeta

class ImportSettings:
           
    __metaclass__ = ABCMeta
    
    _propertiesDefault = OrderedDict((
                            ('Id', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Identifier of the property, equal to the corresponding column header in the TAB-delimited source file ``data``'
                                   }),
                            ('DataType', {
                                   'type': 'Text',
                                   'required': True,
                                   'serializable': False,
                                   'description': 'Data type of the values in the property',
                                   'values':  OrderedDict(( ('Text', {
                                                     'description': 'text strings'
                                                     }),
                                               ('Value', {
                                                     'description': 'numerical values (integer of decimal; the distinction is made by the key *DecimDigits*).\n    Absent values can be coded by an empty string, "NA", "None", "NULL", "null", "inf" or "-"'
                                                     }),
                                               ('HighPrecisionValue', {
                                                     'description': 'same as ``Value``, with higher precision'
                                                     }),
                                               ('Boolean', {
                                                     'description': 'Yes/No binary states. Possible values according to YAML: y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF.\n    Absent values are coded by an empty string'
                                                     }),
                                               ('GeoLongitude', {
                                                     'description': 'longitude part of a geographical coordinates (in decimal degrees).\n    Absent values are coded by an empty string'
                                                     }),
                                               ('GeoLattitude', {
                                                     'description': 'latitude part of a geographical coordinates (in decimal degrees).\n    Absent values are coded by an empty string'
                                                     }),
                                               ('Date', {
                                                     'description': 'calendar dates, ISO formatted (i.e. YYYY-MM-DD).\n    Absent values are coded by an empty string'
                                                     })
                                                ))
                                          }),
                            ('Name', {
                                   'type': 'Text',
                                   'required': True,
                                   'serializable': False,
                                   'description': 'Display name of the property'
                                   }),
                            ('Description', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'Brief description of the property.\n  This will appear in hover tool tips and in the popup box if a user clicks a property info button'
                                   }),
                            ('GroupId', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'Id of the Property group this property belongs to'
                                   }),
                            ('ExternalUrl', {
                                             'type': 'Text',
                                             'required': False,
                                             'description': '''A url that should be opened when the user clicks on a value of this property. The url should
  be formatted as a template, with ``{value}`` interpolated to the property value.
  For example: ``http://www.ebi.ac.uk/ena/data/view/{value}``'''
                                             }),
                            ('IsCategorical', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'propName': 'isCategorical',
                                   'description': 'Instructs Panoptes to treat the property as a categorical variable.\n  For example, a combo box with the possible states is automatically shown in queries for this property.\n  Categorical properties are automatically indexed'
                                   }),
                            ('CategoryColors', {
                                   'type': 'Block',
                                   'required': False,
                                   'propName': 'categoryColors',
                                   'description': 'Specifies display colours for the categorical states of this property.\n  Each key in the block links a possible value of the property to a color (example: ``Accepted: rgb(0,192,0)``).\n  The special value ``_other_`` can be used to specify a color for all other property values that are not listed explicitly'
                                   }),
                            ('BarWidth', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'Draws a bar in the background of the table, indicating the value.\n  Requires *MinVal* & *MaxVal* to be defined',
                                   'siblingOptional': { 'name': 'DataType', 'value': ['Value','HighPrecisionValue']}
                                   }),
                            ('MinVal', {
                                   'type': 'Value',
                                   'required': False,
                                   'default': 0,
                                   'description': 'For *Value* types, upper extent of scale',
                                   'siblingOptional': { 'name': 'DataType', 'value': ['Value','HighPrecisionValue']}
                                   }),
                            ('MaxVal', {
                                   'type': 'Value',
                                   'required': False,
                                   'default': 1.0,
                                   'description': 'For *Value* types, lower extent of scale',
                                   'siblingOptional': { 'name': 'DataType', 'value': ['Value','HighPrecisionValue']}
                                   }),
                            ('MaxLen', {
                                   'type': 'Value',
                                   'required': False,
                                   'serializable': False,
                                   'default': 0,
                                   'description': 'If present used to specify the maximum size of the database column - otherwise it is calculated'
                                   }),
                            ('DecimDigits', {
                                   'type': 'Value',
                                   'required': False,
                                   'propName': 'decimDigits',
                                   'description': 'For *Value* types, specifies the number of decimal digits used to display the value',
                                   'siblingOptional': { 'name': 'DataType', 'value': ['Value','HighPrecisionValue']}
                                   }),
                            ('MaxDecimDigits', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': '(Not currently used) For *Value* types, specifies the number of decimal digits used to store the value in the database',
                                   'siblingOptional': { 'name': 'DataType', 'value': ['Value','HighPrecisionValue']}
                                   }),
                            ('Index', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': 'If set, instructs Panoptes to create an index for this property in the relational database.\n  For large datasets, this massively speeds up queries and sort commands based on this property'
                                   }),
                            ('Search', {
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
                            ('Relation', {
                                   'type': 'Block',
                                   'required': False,
                                   'description': 'Defines a many-to-one foreign relation to a parent data table.\n  The parent table should contain a property with the same name as the primary key property in the child table',
                                   'children': OrderedDict((( 'TableId', {
                                                             'type': 'DatatableID',
                                                             'required': True,
                                                             'description': 'Data table ID of the relation parent table'
                                                             }),
                                                ('ForwardName', {
                                                                'type': 'Text',
                                                                'required': True,
                                                                'default': 'belongs to',
                                                                'description': 'Display name of the relation from child to parent'
                                                                }),
                                                ('ReverseName', {
                                                                'type': 'Text',
                                                                'required': True,
                                                                'default': 'has',
                                                                'description': 'Display name of the relation from parent to child'
                                                                })
                                                ))
                                   }),
                          
                            ('ReadData', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': True,
                                   'description': 'If set to false, this property will not be imported from the TAB-delimited source file'
                                   }),
                            ('CanUpdate', {
                                   'type': 'Boolean',
                                   'default': False,
                                   'required': False,
                                   'description': ' If set to true, this property can be modified by the user. (*NOTE: under construction*)'
                                   }),
                            ('ShowInTable', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': True,
                                   'propName': 'ShowInTable',
                                   'description': 'If set to false this property will not be available to be shown in tables in the application'
                                   }),
                            ('ShowInBrowser', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'propName': 'showInBrowser',
                                   'description': 'If set, this property will automatically appear as a track in the genome browser\n  (only applies if *IsPositionOnGenome* is specified in database settings)'
                                   }),
                            ('TableDefaultVisible', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': True,
                                   'propName': 'showInBrowser',
                                   'description': 'If set to true (default) then this property will appear in tables when they are first shown'
                                   }),
                            ('BrowserDefaultVisible', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'Indicates that the track will activated by default in the genome browser ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('BrowserShowOnTop', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'Indicates that the track will be shown in the top (non-scrolling) area of the genome browser.\n  In this case, it will always be visible ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('ChannelName', {
                                   'type': 'Text',
                                   'required': False,
                                   'propName': 'channelName',
                                   'description': 'Name of the genome browser track this property will be displayed in.\n   Properties sharing the same track name will be displayed in overlay\n   ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('ChannelColor', {
                                   'type': 'Text',
                                   'required': False,
                                   'propName': 'channelColor',
                                   'description': 'Colour used to display this property in the genome browser. Formatted as ``"rgb(r,g,b)"``\n  ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('ConnectLines', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'propName': 'connectLines',
                                   'description': 'Indicate that the points will be connected with lines in the genome browser\n  ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('DefaultVisible', {
                                                'type': 'Boolean',
                                                'required': False,
                                                'default': True,
                                                'description': ''
                                                }),
                            ('Order', {
                                       'type': 'Value',
                                       'required': False,
                                       'serializable': False,
                                       'default': -1,
                                       'description': 'Only used for reference genome tracks'
                                       }),
                            ('SummaryValues', {
                                   'type': 'Block',
                                   'required': False,
                                   'serializable': True,
                                   'description': 'Instructs Panoptes to apply a multiresolution summary algorithm for fast display of this property\n  in the genome browser at any zoom level',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True},
                                   
                                   'children': OrderedDict(( 
                                                ('BlockSizeMin', {
                                                             'type': 'Value',
                                                             'required': False,
                                                             'default': 1,
                                                             'description': 'Minimum summary block size (in bp)'
                                                             }),
                                                ('BlockSizeMax', {
                                                                'type': 'Value',
                                                                'required': True,
                                                                'description': 'Maximum summary block size (in bp)'
                                                                }),
                                                ('ChannelColor', {
                                                                'type': 'Text',
                                                                'required': False,
                                                                'propName': 'channelColor',
                                                                'description': 'Colour of the channel, for numerical channels. Formatted as ``"rgb(r,g,b)"``'
                                                                }),
                                                ('MaxDensity', {
                                                                'type': 'Value',
                                                                'required': False,
                                                                'description': 'For categorical properties this set the scale for the summary track in rows/bp. Defaults to 1/bp'
                                                                })
                                            ))
                                   })
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
                    self._settings = yaml.load(configfile.read())
                    
                except Exception as e:
                    print('ERROR: yaml parsing error: ' + str(e))
                    raise ImportError.ImportException('Error while parsing yaml file {0}'.format(fileName))
                
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
        
        if ('PrimKey' in self._settings and (self._settings['PrimKey'] == 'AutoKey')):
            propid = 'AutoKey'
            self._propidMap[propid] = {
                                          'Id': propid,
                                          'Name': propid,
                                          'DataType': 'Value',
                                          'DecimDigits': 0
                                          }
        
    def _setDefaultValues(self):

        for key in self._propidMap:
            values = self._propidMap[key]
            if 'IsCategorical' in values and values['IsCategorical']:
                self._propidMap[key]['Index'] = True
            if 'Relation' in values and values['Relation']:
                self._propidMap[key]['Index'] = True
            if 'Search' in values and values['Search'] in ['StartPattern', 'Pattern', 'Match']:
                self._propidMap[key]['Index'] = True # Use index to speed up search
        
        if 'SortDefault' in self._settings:
            sd = self._settings['SortDefault']
            if sd in self._propidMap:
                self._propidMap[sd]['Index'] = True    


    def _checkSiblingRequired(self, testDict, pkey, srdef, siblings):

        message = None
        
        siblingValue = srdef['value']
        siblingName = srdef['name']
               
        if testDict[siblingName] != siblingValue:
            if pkey in testDict:
                message = "{} Wrong value for {} (expected {} got {}) for {}".format(pkey, siblingName, siblingValue, testDict[siblingName], str(testDict))
        else:
            if testDict[siblingName] == siblingValue and not pkey in testDict:
                message = "Missing required value {} for {} because {} == {}".format(pkey, str(testDict), siblingName, siblingValue)
                
        return message
                    
    def _checkSettingRequired(self, testDict, pkey, srdef):
        settingValue = srdef['value']
        settingName = srdef['name']
        
        if (settingName in self._settings and self[settingName] == settingValue):
            if not pkey in testDict:
                self._errors.append("Missing required value {} for {}".format(pkey, str(testDict)))
        

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
                    self._errors.append("Wrong sibling value for {} ({})\n (expected {} {}, got {} {}) for {}".format(sibName, pkey, sibValue, type(sibValue), val, type(val), str(testDict)))
                if type(sibValue) == list and val not in sibValue:
                    ret = False
                    self._errors.append("Wrong sibling value for {} ({})\n (expected {} {}, got {} {}) for {}".format(sibName, pkey, sibValue, type(sibValue), val, type(val), str(testDict)))
        return ret

    def _checkProperty(self, testDict, pkey, pdef, siblings = None):
        
        #print("Checking {} {}".format(str(testDict), str(pdef)))        
        if pdef['type'] == 'documentation':
            return
        
        #print "Checking property {} {} {}".format(str(testDict), pkey, pdef)
        if 'required' in pdef and pdef['required']:
            if not pkey in testDict:
                #This is so common it's fudged...
                if pkey == 'Name' and 'Id' in testDict:
                    testDict['Name'] = testDict['Id']
                else:
                    self._errors.append("Missing required value {} for {}".format(pkey, str(testDict)))
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
            if 'values' in pdef:
                if value not in pdef['values']:
                    self._errors.append("Invalid value {} for key {}".format(value, pkey))
        
        #Make sure Booleans are bool
            if pdef['type'] == 'Boolean':
                if not type(value) is bool:
                    self._errors.append("{} must be a boolean is {} ({})".format(pkey,type(value),value))
            elif pdef['type'] == 'Block':
                if not type(value) is dict:
                    self._errors.append("{} must be a block is {}".format(pkey, value))
            elif pdef['type'] == 'List':
                if not type(value) is list:
                    self._errors.append("{} must be a List is {}".format(pkey, value))
            elif pdef['type'] == 'Value':
                if not (type(value) is int or type(value) is float):
                    self._errors.append("{} must be a Value is {}".format(pkey, value))
            elif pdef['type'] == 'Text' or pdef['type'] == 'DatatableID':
                if not type(value) is str:
                    self._errors.append("{} must be a str is {}".format(pkey, value))
            elif pdef['type'] == 'Text or List':
                if not (type(value) is str or type(value) is list):
                    self._errors.append("{} must be Text or List is {}".format(pkey, value))
            elif pdef['type'] == 'PropertyID':
                if not (value in self._propidMap or (pkey == 'PrimKey' and value == 'AutoKey') or value == 'None' or ('AutoScanProperties' in self._settings and self._settings["AutoScanProperties"])):
                    self._errors.append("{} must be a valid PropertyId is {}".format(pkey, value))
            elif pdef['type'] == 'PropertyIDs':
                pass
                for propid in value.split(','):
                    propid = propid.strip()
                    if not (propid in self._propidMap or '@' in propid):
                        self._errors.append("{} must be a valid PropertyId is {}".format(pkey, propid))
            elif pdef['type'] == 'PropertyIDList':
                pass
                if not type(value) is list:
                    self._errors.append("{} must be a List is {}".format(pkey, value))
                for propid in value:
                    if not (propid in self._propidMap or '@' in propid):
                        self._errors.append("{} must be a valid PropertyId is {}".format(pkey, propid))
            else:
                #Error in definition above
                self._errors.append("Undefined type {} for {}".format(pdef['type'], pkey))

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
                    self._errors.append("When " + pkey + " one of following must be set " + ",".join(map(lambda x: x['name'] + "=" + x['value'], pdef['siblingRequired'])) + " for " + str(testDict))
                    
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
                    self._errors.append("Unknown property key {} in {}".format(key, str(toValidate)))
                    continue
                
                defn = definition[key]
                
                if 'children' in defn:
                    self._validate(value, defn["children"])
                elif key in definition:
                    if type(value) == dict:
                        self._checkProperty(value, key, defn)
                else:
                    self._errors.append("Unknown configuration item: {}".format(key))
                     
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
        if 'Properties' in self._settings:
            if not type(self._settings['Properties']) is list:
                raise Exception('Properties token should be a list')
            for propSource in self._settings['Properties']:
                if 'Id' not in propSource:
                    raise Exception('Property is missing Id field')
                propids = propSource['Id']
                if not (isinstance(propids, basestring)):
                    raise Exception('Property has invalid Id field: ' + str(propids)) #Merge sections with the same Id
                for propid in propids.split(','):
                    propid = propid.strip()
                    try:
                        if not propid in self._propidMap:
                            properties = {}
                            self._propidMap[propid] = properties
                        self._propidMap[propid].update(copy.deepcopy(propSource))
                        self._propidMap[propid]['Id'] = propid
                    except Exception as e:
                        raise Exception('Invalid property "{0}": {1}'.format(propid, str(e)))
            
            #Now we need to update the original so it can be validated
            propsList = copy.deepcopy(self._settings["Properties"])
            #Do it backwards so can deleted without changing the index
            for i, propDetails in reversed(list(enumerate(propsList))):
                propid = propDetails['Id']
                if propid in self._propidMap:
                    self._settings['Properties'][i] = copy.deepcopy(self._propidMap[propid])
                else:
                    del self._settings['Properties'][i]

    #Set any implied values here
    def _postProcess(self):
        
        for propid in self.getPropertyNames():
            cc = self.getPropertyValue(propid, 'CategoryColors')
            if cc:
                categories = [x for x in cc]
                self._propidMap[propid]['Categories'] = categories
                print ("Set Categories for {}".format(propid))


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

    #Not at all sure about this...
    def ConvertStringsToSafeSQL(self, settings):

        for key in settings:
            val = settings[key]
            if type(val) is str:
                settings[key] = val.replace('"', '`').replace("'", '`')
        return settings

    def _prepareSerialization(self, settings, defn):
        
        tosave = copy.deepcopy(settings)
        for key in defn:
            if not defn[key].get('serializable', True):
                if key in tosave:
                    del tosave[key]
            else:
                if 'propName' in defn[key]:
                    propName = defn[key]['propName']
                    if key in settings:
                        tosave[propName] = settings[key]
                        del tosave[key]
                else:
                    propName = key
                if 'default' in defn[key]:
                    includeDefault = True
                    
                    if 'siblingOptional' in defn[key]:
                        if not self._hasOptionalSibling(settings, key, defn[key]):
                            includeDefault = False
                    
                    if includeDefault:
                        tosave[propName] = settings.get(key, defn[key]['default'])

                
        return simplejson.dumps(self.ConvertStringsToSafeSQL(tosave))
        
    #For insertion into tablecatalog, graphs
    def serialize(self):
        
        return self._prepareSerialization(self._settings, self._settingsDef)
    
    #Used to pick up table settings from the db
    def deserialize(self, settings):
        
        parsed = simplejson.loads(settings, strict=False)
        #Have to not validate as stuff has been deleted when serializing
        #Can't just remove from _settingsDef and Properties are missing     
        self.loadProps(parsed, False)           
    
    def getPropertyNames(self):
        return self._propidMap.keys()
       
    #For insertion into propertycatalog              
    def serializeProperty(self, key):    
        return self._prepareSerialization(self.getProperty(key), self._settingsDef["Properties"]["children"])

    
    def serializeSummaryValues(self, key):
        props = self.getProperty(key)
        saved = copy.deepcopy(props['SummaryValues'])
        
        for val in props['SummaryValues']:
            defn = self._propertiesDefault['SummaryValues']['children']
            if val in defn and 'propName' in defn[val]:
                name =  defn[val]['propName']
                saved[name] = saved[val]
                del saved[val] 

        
        for val in ['CategoryColors', 'DefaultVisible', 'IsCategorical', 'Categories', 'ChannelColor']:
            if val in props:
                if val in self._propertiesDefault and 'propName' in self._propertiesDefault[val]:
                    name =  self._propertiesDefault[val]['propName']
                else:
                    name = val
                saved[name] = props[val]

        for val in ['MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax', 'Order', 'Name']:
            if val in saved:
                del saved[val]

        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))

     
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
        if key == 'Name':
            if key not in prop:
                key = 'Id'
                
        if key in self._settingsDef["Properties"]["children"] and 'default' in self._settingsDef["Properties"]["children"][key]:
            return prop.get(key, self._settingsDef["Properties"]["children"][key]['default'])
        else:
            if key in prop:
                return (prop[key])
            else:
                return None
    
    def setPropertyValue(self, propid, key, value):
        self._propidMap[propid][key] = value
        
    def getTableBasedSummaryValue(self, key):
        for defn in self._settings['TableBasedSummaryValues']:
            if defn['Id'] == key:
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

    from Settings2Dtable import Settings2Dtable
    from SettingsRefGenome import SettingsRefGenome
    from SettingsDataTable import SettingsDataTable
    from SettingsDataset import SettingsDataset
    from SettingsGraph import SettingsGraph    

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
