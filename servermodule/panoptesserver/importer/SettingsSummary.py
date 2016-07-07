# -*- coding: utf-8 -*-
from __future__ import print_function
from collections import OrderedDict
from SettingsDataTable import SettingsDataTable
import copy
import yaml

class SettingsSummary(SettingsDataTable):
    
    def getSettings(self):
        parentSettings = SettingsDataTable.getSettings(self)
        #copy is used for settings that will be modified
        summarySettings = { 'properties':copy.deepcopy(parentSettings['properties'])}
        #summarySettings.append(parentSettings['properties']['children']['summaryValues']['children'])
        #print (summarySettings)
        #del summarySettings['properties']['children']['summaryValues']

        return summarySettings
        

    #Where a file defines a single property
    #Mangles the input to make it fit the same definition structure
    def loadPropsFile(self, propName, fileName):
        if fileName is not None:
            self.fileName = fileName
            if self._logLevel:
                self._log('Loading props file settings from: '+fileName)
            self._settings = {}
            self._settings['properties'] = []
            with open(self.fileName, 'r') as configfile:
                try:
                    input = yaml.load(configfile.read())
                    input['name'] = propName
                    input['id'] = propName
                    if 'dataType' not in input:
                        if 'isCategorical' in input and input['isCategorical']:
                            input['dataType'] = 'Text'
                        else:
                            input['dataType'] = 'Value'
                    #Because there's a different definition hierarchy
                    if not 'summaryValues' in input:
                        input['summaryValues'] = {}
                        for key in self._propertiesDefault['summaryValues']['children']:
                            if key in input:
                                input['summaryValues'][key] = input[key]
                                del input[key]
                    self._settings['properties'].append(input)
                except Exception as e:
                    print('ERROR: yaml parsing error: ' + str(e))
                    raise ImportError.ImportException('Error while parsing yaml file {0}'.format(fileName))
                
            self._load()
            if self._logLevel:
                self._log('Settings: '+str(self._settings))
        else:
            self.fileName = ''
            self._settings = {}
            
    def _getDocHeader(self):
        return ''
        
    def _getDocFilename(self):
        return ''
