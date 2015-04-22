# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import DQXDbTools
import DQXUtils
import config
import shutil
from ProcessDatabase import ProcessDatabase
from ProcessFilterBank import ProcessFilterBank

from BaseImport import BaseImport
from ImportSettings import ImportSettings

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

            DQXUtils.CheckValidTableIdentifier(tableid)
    
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'tablecatalog'))
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'propertycatalog'))
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'relations'))
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'tablebasedsummaryvalues'))
    
            tableSettings = self.getSettings(tableid)
    
            # Drop existing tablecatalog record
            sql = "DELETE FROM tablecatalog WHERE id='{0}'".format(tableid)
            self._execSql(sql)

            # Add to tablecatalog
            sql = "INSERT INTO tablecatalog VALUES ('{0}', '{1}', '{2}', {3}, '{4}', {5})".format(
                tableid,
                tableSettings['NamePlural'],
                tableSettings['PrimKey'],
                tableSettings['IsPositionOnGenome'],
                tableSettings.serialize(),
                self.tableOrder
            )
            self._execSql(sql)
            self.tableOrder += 1
    

    
            sql = "DELETE FROM propertycatalog WHERE tableid='{0}'".format(tableid)
            self._execSql(sql)
            sql = "DELETE FROM relations WHERE childtableid='{0}'".format(tableid)
            self._execSql(sql)

            ranknr = 0
            for propid in tableSettings.getPropertyNames():
                
                if not tableSettings.getPropertyValue(propid,'ReadData'):
                    continue
                
                sql = "INSERT INTO propertycatalog VALUES ('', 'fixed', '{0}', '{1}', '{2}', '{3}', {4}, '{5}')".format(
                    tableSettings.getPropertyValue(propid, 'DataType'),
                    propid,
                    tableid,
                    tableSettings.getPropertyValue(propid, 'Name'),
                    0,
                    tableSettings.serializeProperty(propid)
                )
                self._execSql(sql)
                
                if 'Relation' in tableSettings.getProperty(propid):
                    relationSettings = tableSettings.getPropertyValue(propid, 'Relation')
                    self._log('Creating relation: '+ tableSettings.serializePropertyValue(propid, 'Relation'))
                    sql = "INSERT INTO relations VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', '{5}')".format(
                        tableid,
                        propid,
                        relationSettings['TableId'],
                        '',
                        relationSettings['ForwardName'],
                        relationSettings['ReverseName']
                    )
                    self._execSql(sql)
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
            sql = "DELETE FROM graphs WHERE tableid='{0}'".format(tableid)
            self._execSql(sql)
            graphsfolder = os.path.join(folder, tableid, 'graphs')
            if os.path.exists(graphsfolder):
                for graphid in os.listdir(graphsfolder):
                    if os.path.isdir(os.path.join(graphsfolder, graphid)):
                        print('Importing graph ' + graphid)
                        graphfolder = os.path.join(graphsfolder, graphid)
                        
                        graphSettings = ImportSettings(os.path.join(graphfolder, 'settings'), settingsDef = ImportSettings._graphSettings)
                       
                        crosslink = graphSettings['CrossLink']
                        sql = "INSERT INTO graphs VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', 0)".format(
                            graphid,
                            tableid,
                            'tree',
                            graphSettings['Name'],
                            graphSettings.serialize(),
                            crosslink
                        )
                        self._execSql(sql)
                        destFolder = os.path.join(config.BASEDIR, 'Graphs', self._datasetId, tableid)
                        if not os.path.exists(destFolder):
                            os.makedirs(destFolder)
                        shutil.copyfile(os.path.join(graphfolder, 'data'), os.path.join(destFolder, graphid))

    
    def importAllDataTables(self):
        
        datatables = self._getTables()
        
        datatables = self._getDatasetFolders(datatables)

        for datatable in datatables:
            
            self.ImportDataTable(datatable)
        
        return datatable
    
    
