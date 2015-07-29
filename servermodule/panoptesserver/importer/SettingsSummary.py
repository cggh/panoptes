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
        summarySettings = { 'Properties':copy.deepcopy(parentSettings['Properties'])}
        #summarySettings.append(parentSettings['Properties']['children']['SummaryValues']['children'])
        #print (summarySettings)
        #del summarySettings['Properties']['children']['SummaryValues']

        return summarySettings
        

    #Where a file defines a single property
    #Mangles the input to make it fit the same definition structure
    def loadPropsFile(self, propName, fileName):
        if fileName is not None:
            self.fileName = fileName
            if self._logLevel:
                self._log('Loading props file settings from: '+fileName)
            self._settings = {}
            self._settings['Properties'] = []
            with open(self.fileName, 'r') as configfile:
                try:
                    input = yaml.load(configfile.read())
                    input['Name'] = propName
                    input['Id'] = propName
                    if 'DataType' not in input:
                        if 'IsCategorical' in input and input['IsCategorical']:
                            input['DataType'] = 'Text'
                        else:
                            input['DataType'] = 'Value'
                    #Because there's a different definition hierarchy
                    if not 'SummaryValues' in input:
                        input['SummaryValues'] = {}
                        for key in self._propertiesDefault['SummaryValues']['children']:
                            if key in input:
                                input['SummaryValues'][key] = input[key]
                                del input[key]
                    self._settings['Properties'].append(input)
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
