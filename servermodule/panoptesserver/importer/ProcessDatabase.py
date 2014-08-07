import os
import SettingsLoader
import datetime
import SimpleFilterBankData
import MultiCategoryDensityFilterBankData
import ImpUtils
import logging
from BaseImport import BaseImport
from LoadTable import LoadTable

#Enable with logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ProcessDatabase(BaseImport):
        
    def importData(self, tableid, inputFile = None, createSubsets = False, addPrimaryKey = False, loadSettings = None, properties = None):
        
        
        if loadSettings is None:
            loadSettings, properties = self._fetchSettings(tableid)
            
        if inputFile is None:
            settings, data = self._getDataFiles(tableid)
        else:
            data = inputFile
            
        columns = [ {
                        'name': prop['propid'],
                        'DataType': prop['DataType'],
                        'Index': prop['Settings']['Index'],
                        'ReadData': prop['Settings']['ReadData']
                    }
                    for prop in properties if (prop['propid'] != 'AutoKey')]
        
        if addPrimaryKey:
            columns.append({'name': loadSettings['PrimKey'], 'DataType':'Text', 'Index': False, 'ReadData': True})
            
        
        
        loader = LoadTable(self._calculationObject, data, self._datasetId, tableid, columns, loadSettings, self._importSettings, createSubsets, allowSubSampling = None)
        
        if not self._importSettings['ConfigOnly']:
            self._log(("Preparing to load {} to {}.{}").format(data, self._datasetId, tableid))
            loader.start()
            
                
        return loader
           
    
