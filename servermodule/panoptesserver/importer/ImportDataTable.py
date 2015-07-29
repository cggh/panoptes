# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import shutil
from ProcessDatabase import ProcessDatabase
from ProcessFilterBank import ProcessFilterBank

from BaseImport import BaseImport
from SettingsGraph import SettingsGraph

class ImportDataTable(BaseImport):
    tableOrder = 0
      
    #Retrieve and validate settings
    def getSettings(self, tableid):
        tableSettings = self._fetchSettings(tableid)    
        
        if tableSettings['MaxTableSize'] is not None:
            self._log('WARNING: table size limited to '+str(tableSettings['MaxTableSize']))
                   
        return tableSettings

    def ImportDataTable(self, tableid):
        
        with self._logHeader('Importing datatable {0}'.format(tableid)):
   
            tableSettings = self.getSettings(tableid)
    
            self._dao.insertTableCatalogEntry(tableid, tableSettings, self.tableOrder)
            self.tableOrder += 1
       
            self._dao.deletePropertiesForTable(tableid)
            
            self._dao.deleteRelationsForTable(tableid)

            ranknr = 0
            for propid in tableSettings.getPropertyNames():
                
                if not tableSettings.getPropertyValue(propid,'ReadData'):
                    continue
                
                self._dao.insertTableProperty(tableid, tableSettings, propid)
                
                self._dao.insertTableRelation(tableid, tableSettings, propid)
                
                ranknr += 1    
 
            importer = ProcessDatabase(self._calculationObject, self._datasetId, self._importSettings, self._workspaceId)
                       
            importer.importData(tableid, createSubsets = True)
            
            filterBanker = ProcessFilterBank(self._calculationObject, self._datasetId, self._importSettings, self._workspaceId)
            filterBanker.createSummaryValues(tableid)
           
            importer.cleanUp()
    
            filterBanker.createTableBasedSummaryValues(tableid)
                
            filterBanker.printLog()
            
            self.importGraphs(tableid)


    def importGraphs(self, tableid):
        folder = self._datatablesFolder
        with self._logHeader('Importing graphs'):
            self._dao.deleteGraphsForTable(tableid)
            graphsfolder = os.path.join(folder, tableid, 'graphs')
            if os.path.exists(graphsfolder):
                for graphid in os.listdir(graphsfolder):
                    if os.path.isdir(os.path.join(graphsfolder, graphid)):
                        print('Importing graph ' + graphid)
                        graphfolder = os.path.join(graphsfolder, graphid)
                        
                        graphSettings = SettingsGraph(os.path.join(graphfolder, 'settings'))
                       
                        self._dao.insertGraphForTable(tableid, graphid, graphSettings)
                        destFolder = os.path.join(self._config.getBaseDir(), 'Graphs', self._datasetId, tableid)
                        if not os.path.exists(destFolder):
                            os.makedirs(destFolder)
                        shutil.copyfile(os.path.join(graphfolder, 'data'), os.path.join(destFolder, graphid))

    
    def importAllDataTables(self):
        
        datatables = self._getTables()
        
        datatables = self._getDatasetFolders(datatables)

        for datatable in datatables:
            
            self.ImportDataTable(datatable)
        
        return datatable
    
    
