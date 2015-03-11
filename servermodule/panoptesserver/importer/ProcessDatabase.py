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
        
    def cleanUp(self):
        if not self._importSettings['ConfigOnly']:
            #Wait for the database loader thread to return
            self._dbloader.join()
    
    
            self._dbloader.printLog()
    
            if self._dbloader.status is not None:
                self._log(str(self._dbloader.status))
                raise Exception("Database loading failed")

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
                        'ReadData': prop['Settings']['ReadData'],
                        'MaxLen': prop['Settings']['MaxLen']
                    }
                    for prop in properties if (prop['propid'] != 'AutoKey')]
        
        if addPrimaryKey:
            columns.append({'name': loadSettings['PrimKey'], 'DataType':'Text', 'Index': False, 'ReadData': True, 'MaxLen': 0})
                   
        self._dbloader = LoadTable(self._calculationObject, data, self._datasetId, tableid, columns, loadSettings, self._importSettings, createSubsets, allowSubSampling = None)
        
        if not self._importSettings['ConfigOnly']:
            self._log(("Preparing to load {} to {}.{}").format(data, self._datasetId, tableid))
            self._dbloader.start()
            
                
           
    
