# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import DQXDbTools
import DQXUtils
import ImpUtils
import customresponders.panoptesserver.Utils as Utils
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
from ProcessDatabase import ProcessDatabase
from ProcessFilterBank import ProcessFilterBank
from BaseImport import BaseImport
from SettingsCustomData import SettingsCustomData

class ImportCustomData(BaseImport):
    
        #Retrieve and validate settings
    def getSettings(self, source, workspaceid):
        settings = self._fetchCustomSettings(source, workspaceid)    
        
        return settings
    

    def ImportCustomData(self, sourceid, tableid):
        
        folder = os.path.join(self._folder,sourceid)
        
        with self._logHeader('Importing custom data'):
            print('Importing custom data into {0}, {1}, {2} FROM {3}'.format(self._datasetId, self._workspaceId, tableid, folder))
    
            credInfo = self._calculationObject.credentialInfo
    
            if not ImpUtils.IsDatasetPresentInServer(credInfo, self._datasetId):
                raise Exception('Dataset {0} is not found. Please import the dataset first'.format(self._datasetId))
    
            credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'propertycatalog'))
            credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'workspaces'))
 
    
            self._dao.deleteCustomDataCatalogEntry(sourceid, tableid)
    
            tables = self._dao.getTablesInfo(tableid)
            tableSettings = tables[0]["settings"]
            primkey = tables[0]["primkey"]
    
            allowSubSampling = tableSettings['allowSubSampling']
    
            settings = self.getSettings(sourceid, tableid)
    
            self._dao.insertCustomDataSettings(sourceid, tableid, settings)
            
            sourcetable=Utils.GetTableWorkspaceProperties(self._workspaceId, tableid)
            print('Source table: '+sourcetable)
    
            #Get list of existing properties
            with DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId) as cur:
                cur.execute('SELECT propid FROM propertycatalog WHERE (workspaceid="{0}") and (source="custom") and (tableid="{1}")'.format(self._workspaceId, tableid))
                existingProperties = [row[0] for row in cur.fetchall()]
                print('Existing properties: '+str(existingProperties))
    
            # remove primary key, just in case
            propidList = settings.getPropertyNames()
            if primkey in propidList:
                del propidList[primkey]
                
            with DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId) as cur:
                if not self._importSettings['ConfigOnly']:
                    # Dropping columns that will be replaced
                    toRemoveExistingProperties = []
                    for existProperty in existingProperties:
                        if existProperty in propidList:
                            toRemoveExistingProperties.append(existProperty)
                    print('Removing outdated information:')
                    if len(toRemoveExistingProperties) > 0:
                        for prop in toRemoveExistingProperties:
                            self._dao.deleteFromWorkspacePropertyCatalog(tableid, prop)
                        sql = "ALTER TABLE {0} ".format(DBTBESC(sourcetable))
                        for prop in toRemoveExistingProperties:
                            if prop != toRemoveExistingProperties[0]:
                                sql += ", "
                            sql += "DROP COLUMN {0}".format(DBCOLESC(prop))
                        self._calculationObject.LogSQLCommand(sql)
                        cur.execute(sql)
    
    
                ranknr = 0
                for propid in settings.getPropertyNames():
                    
                    print('Create property catalog entry for {0} {1} {2}'.format(self._workspaceId, tableid, propid))
                    self._dao.deleteFromWorkspacePropertyCatalog(tableid, propid)
                    self._dao.insertIntoWorkspacePropertyCatalog(tableid, propid, settings)
                    ranknr += 1
        
                if not self._importSettings['ConfigOnly']:
                    tmptable = Utils.GetTempID()
                              
                    print('Importing custom data into {0}, {1}, {2} FROM {3}'.format(self._datasetId, self._workspaceId, tableid, folder))

                    importer = ProcessDatabase(self._calculationObject, self._datasetId, self._importSettings, workspaceId = self._workspaceId, baseFolder = folder, dataDir = 'customdata')
                    importer._sourceId = self._sourceId
            
                    tableSettings = SettingsCustomData()
                    props = settings['properties']
                    if primkey not in settings.getPropertyNames():
                        props.append({ 'id': primkey, 'name': primkey, 'dataType':'Text', 'index': False, 'readData': True, 'maxLen': 0})
                    tableSettings.loadProps({'primKey': primkey, 'properties' : props}, False)
                    importer.importData(tableid = tmptable, inputFile = os.path.join(folder,'data'), loadSettings = tableSettings)
                    
                    importer.cleanUp()
                    

                    print('Checking column existence')
                    existingcols = []
                    cur.execute('SHOW COLUMNS FROM {0}'.format(DBTBESC(tableid)))
                    for row in cur.fetchall():
                        existingcols.append(row[0])
                    cur.execute('SHOW COLUMNS FROM {0}'.format(DBTBESC(sourcetable)))
                    for row in cur.fetchall():
                        existingcols.append(row[0])
                    print('Existing columns: '+str(existingcols))
                    for propid in propidList:
                        if propid in existingcols:
                            raise Exception('Property "{0}" from custom data source "{1}" is already present'.format(propid, sourceid))


                    print('Creating new columns')
                    self._log('WARNING: better mechanism to determine column types needed here')#TODO: implement
                    frst = True
                    sql = "ALTER TABLE {0} ".format(DBTBESC(sourcetable))
                    for propid in propidList:
                        if not frst:
                            sql += " ,"
                        sqldatatype = ImpUtils.GetSQLDataType(settings.getPropertyValue(propid,'dataType'))
                        sql += "ADD COLUMN {0} {1}".format(DBCOLESC(propid), sqldatatype)
                        frst = False
                        self._calculationObject.LogSQLCommand(sql)
                    cur.execute(sql)
    
    
                    print('Joining information')
                    frst = True
                    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, sourcetable))
                    sql = "update {0} left join {1} on {0}.{2}={1}.{2} set ".format(DBTBESC(sourcetable), tmptable, DBCOLESC(primkey))
                    for propid in propidList:
                        if not frst:
                            sql += ", "
                        sql += "{0}.{2}={1}.{2}".format(DBTBESC(sourcetable), tmptable, DBCOLESC(propid))
                        frst = False
                    self._calculationObject.LogSQLCommand(sql)
                    cur.execute(sql)
    
    
                    print('Cleaning up')
                    self._dao.dropTable(tmptable, cur)
    
                if not self._importSettings['ConfigOnly']:
                    print('Updating view')
                    Utils.UpdateTableInfoView(self._workspaceId, tableid, allowSubSampling, cur)
    
                cur.commit()
                
                filterBanker = ProcessFilterBank(self._calculationObject, self._datasetId, self._importSettings, workspaceId = self._workspaceId, baseFolder = None, dataDir = 'customdata')
                filterBanker.copy(self)
                filterBanker.createCustomSummaryValues(sourceid, tableid)
                filterBanker.printLog()
                
 
    
    def _getDataList(self, table):

        name = 'CustomData'
        
        settings = self._fetchCustomSettings(None, table)
         
        customdatalist = None
        
        if not settings is None:       
            customdatalist = settings[name]
            
        if customdatalist is None:# Alternatively, just use list of folders
                customdatalist = []
                for customid in os.listdir(self._folder):
                    if os.path.isdir(os.path.join(self._folder, customid)):
                        customdatalist.append(customid)
                print('Custom data list taken from folders')
        else:
                print('Custom data list taken from settings')
        
        print('Custom data list: '+str(customdatalist))
        return customdatalist 

    
    
    def importAllCustomData(self, importTable = None):
    
        print('Scanning for custom data in {}'.format(self._workspaceId))
    
        tables = self._dao.getTablesInfo(importTable)
            
        tableMap = {table['id']:table for table in tables}
                
        workspaces = self._getTables()
        print('Importing custom data')
        if len(workspaces) == 0:
            print('No custom data: skipping')
            return
                
        for table in workspaces:
            #Only use of table map
            if not table in tableMap:
                if importTable == None:
                    raise Exception('Invalid table id {}'.format(table) )
                else:
                    self._log("Ignoring table:" + table)
                    continue
                        
            self._folder = os.path.join(self._datatablesFolder,self._dataDir,table)
                        
            tabs = self._getDataList(table)
            
            for sourceid in tabs:
                self._sourceId = sourceid
                self.ImportCustomData(sourceid, table)
                

       
            
