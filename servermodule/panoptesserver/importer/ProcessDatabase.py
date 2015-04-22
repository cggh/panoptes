import os
import datetime
import SimpleFilterBankData
import MultiCategoryDensityFilterBankData
import ImpUtils
import logging
import linecache
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
                exc_type, exc_obj, tb = self._dbloader.status
                f = tb.tb_frame
                lineno = tb.tb_lineno
                filename = f.f_code.co_filename
                linecache.checkcache(filename)
                line = linecache.getline(filename, lineno, f.f_globals)
                raise Exception("Database loading failed {} {} {} {}".format(filename, lineno, line.strip(), exc_obj))

    def importData(self, tableid, inputFile = None, createSubsets = False, loadSettings = None):
        
        
        if loadSettings is None:
            loadSettings = self._fetchSettings(tableid)
            
        if inputFile is None:
            settings, data = self._getDataFiles(tableid)
        else:
            data = inputFile
            
                   
        self._dbloader = LoadTable(self._calculationObject, data, self._datasetId, tableid, loadSettings, self._importSettings, createSubsets, allowSubSampling = None)
        
        if not self._importSettings['ConfigOnly']:
            self._log(("Preparing to load {} to {}.{}").format(data, self._datasetId, tableid))
            self._dbloader.start()
            
                
           
    
