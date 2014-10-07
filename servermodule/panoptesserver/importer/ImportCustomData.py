# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import DQXDbTools
import DQXUtils
import config
import SettingsLoader
import ImpUtils
import customresponders.panoptesserver.Utils as Utils
import simplejson
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
from ProcessDatabase import ProcessDatabase
from BaseImport import BaseImport

class ImportCustomData(BaseImport):
    
        #Retrieve and validate settings
    def getSettings(self, source, workspaceid):
        settings, properties = self._fetchCustomSettings(source, workspaceid)    
        
        return settings, properties
    
    def ImportCustomData(self, sourceid, tableid):
        
        folder = os.path.join(self._folder,sourceid)
        
        with self._logHeader('Importing custom data'):
            print('Importing custom data into {0}, {1}, {2} FROM {3}'.format(self._datasetId, self._workspaceId, tableid, folder))
    
            credInfo = self._calculationObject.credentialInfo
    
            if not ImpUtils.IsDatasetPresentInServer(credInfo, self._datasetId):
                raise Exception('Dataset {0} is not found. Please import the dataset first'.format(self._datasetId))
    
            credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'propertycatalog'))
            credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'workspaces'))
            with DQXDbTools.DBCursor(credInfo, self._datasetId) as cur:
                cur.execute('SELECT primkey, settings FROM tablecatalog WHERE id="{0}"'.format(tableid))
                row = cur.fetchone()
                if row is None:
                    raise Exception('Unable to find table record for table {0} in dataset {1}'.format(tableid, self._datasetId))
                primkey = row[0]
                tableSettingsStr = row[1]
    
            self._execSql('DELETE FROM customdatacatalog WHERE tableid="{tableid}" and sourceid="{sourceid}"'.format(
                tableid=tableid,
                sourceid=sourceid
            ))
    
    
            tableSettings = SettingsLoader.SettingsLoader()
            tableSettings.LoadDict(simplejson.loads(tableSettingsStr, strict=False))
    
            allowSubSampling = tableSettings['AllowSubSampling']
    
            isPositionOnGenome = False
            if tableSettings.HasToken('IsPositionOnGenome') and tableSettings['IsPositionOnGenome']:
                isPositionOnGenome = True
                chromField = tableSettings['Chromosome']
                posField = tableSettings['Position']
    
            settings, properties = self.getSettings(sourceid, tableid)
    
            self._execSql("INSERT INTO customdatacatalog VALUES ('{tableid}', '{sourceid}', '{settings}')".format(
                tableid=tableid,
                sourceid=sourceid,
                settings=settings.ToJSON()
            ))
    
            # remove primary key, just in case
            properties = [prop for prop in properties if prop['propid'] != primkey ]
    
            sourcetable=Utils.GetTableWorkspaceProperties(self._workspaceId, tableid)
            print('Source table: '+sourcetable)
    
            #Get list of existing properties
            with DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId) as cur:
                cur.execute('SELECT propid FROM propertycatalog WHERE (workspaceid="{0}") and (source="custom") and (tableid="{1}")'.format(self._workspaceId, tableid))
                existingProperties = [row[0] for row in cur.fetchall()]
                print('Existing properties: '+str(existingProperties))
    
            propidList = []
            for property in properties:
                DQXUtils.CheckValidColumnIdentifier(property['propid'])
                propidList.append(property['propid'])
    
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
                            print('Removing outdated information: {0} {1} {2}'.format(self._workspaceId, prop, tableid))
                            sql = 'DELETE FROM propertycatalog WHERE (workspaceid="{0}") and (propid="{1}") and (tableid="{2}")'.format(self._workspaceId, prop, tableid)
                            print(sql)
                            cur.execute(sql)
                        sql = "ALTER TABLE {0} ".format(DBTBESC(sourcetable))
                        for prop in toRemoveExistingProperties:
                            if prop != toRemoveExistingProperties[0]:
                                sql += ", "
                            sql += "DROP COLUMN {0}".format(DBCOLESC(prop))
                        self._calculationObject.LogSQLCommand(sql)
                        cur.execute(sql)
    
    
                ranknr = 0
                for property in properties:
                    propid = property['propid']
                    settings = property['Settings']
                    extraSettings = settings.Clone()
                    extraSettings.DropTokens(['Name', 'DataType', 'Order','SummaryValues'])
                    print('Create property catalog entry for {0} {1} {2}'.format(self._workspaceId, tableid, propid))
                    sql = "DELETE FROM propertycatalog WHERE (workspaceid='{0}') and (propid='{1}') and (tableid='{2}')".format(self._workspaceId, propid, tableid)
                    self._execSql(sql)
                    sql = "INSERT INTO propertycatalog VALUES ('{0}', 'custom', '{1}', '{2}', '{3}', '{4}', {5}, '{6}')".format(
                        self._workspaceId,
                        settings['DataType'],
                        propid,
                        tableid,
                        settings['Name'],
                        0,
                        extraSettings.ToJSON()
                    )
                    self._execSql(sql)
                    ranknr += 1
    
                propDict = {}
                for property in properties:
                    propDict[property['propid']] = property
    
                if not self._importSettings['ConfigOnly']:
                    tmptable = Utils.GetTempID()
                    columns = [ {
                                    'name': prop['propid'],
                                    'DataType': prop['DataType'],
                                    'Index': prop['Settings']['Index'],
                                    'ReadData': prop['Settings']['ReadData']
                                } for prop in properties]
                    columns.append({'name':primkey, 'DataType':'Text', 'Index': False, 'ReadData': True})
          
    #                LoadTable.LoadTable(
    #                    calculationObject,
    #                    os.path.join(folder, 'data'),
    #                    datasetId,
    #                    tmptable,
    #                    columns,
    #                    {'PrimKey': primkey},
    #                    importSettings,
    #                    False
    #                )
                    
                    print('Importing custom data into {0}, {1}, {2} FROM {3}'.format(self._datasetId, self._workspaceId, tableid, folder))
#                    importer = ImportDataset(self._calculationObject, self._datasetId, self._importSettings)
                    importer = ProcessDatabase(self._calculationObject, self._datasetId, self._importSettings, workspaceId = self._workspaceId, baseFolder = folder, dataDir = 'customdata')
                    importer._sourceId = self._sourceId
            
                    tableSettings = {'PrimKey': primkey}
                    loader = importer.importData(tableid = tmptable, inputFile = os.path.join(folder,'data'), properties = properties, loadSettings = tableSettings, addPrimaryKey = True)
                    loader.join()
                    if loader.status is not None:
                        self._log(loader.status)
                        raise Exception("Database loading failed")

                    print('Checking column existence')
                    existingcols = []
                    cur.execute('SHOW COLUMNS FROM {0}'.format(DBTBESC(tableid)))
                    for row in cur.fetchall():
                        existingcols.append(row[0])
                    cur.execute('SHOW COLUMNS FROM {0}'.format(DBTBESC(sourcetable)))
                    for row in cur.fetchall():
                        existingcols.append(row[0])
                    print('Existing columns: '+str(existingcols))
                    for prop in properties:
                        propid = prop['propid']
                        if propid in existingcols:
                            raise Exception('Property "{0}" from custom data source "{1}" is already present'.format(propid, sourceid))


                    print('Creating new columns')
                    self._log('WARNING: better mechanism to determine column types needed here')#TODO: implement
                    frst = True
                    sql = "ALTER TABLE {0} ".format(DBTBESC(sourcetable))
                    for property in properties:
                        propid = property['propid']
                        if not frst:
                            sql += " ,"
                        sqldatatype = ImpUtils.GetSQLDataType(property['DataType'])
                        sql += "ADD COLUMN {0} {1}".format(DBCOLESC(propid), sqldatatype)
                        frst = False
                        self._calculationObject.LogSQLCommand(sql)
                    cur.execute(sql)
    
    
                    print('Joining information')
                    frst = True
                    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, sourcetable))
                    sql = "update {0} left join {1} on {0}.{2}={1}.{2} set ".format(DBTBESC(sourcetable), tmptable, DBCOLESC(primkey))
                    for property in properties:
                        propid = property['propid']
                        if not frst:
                            sql += ", "
                        sql += "{0}.{2}={1}.{2}".format(DBTBESC(sourcetable), tmptable, DBCOLESC(propid))
                        frst = False
                    self._calculationObject.LogSQLCommand(sql)
                    cur.execute(sql)
    
    
                    print('Cleaning up')
                    cur.execute("DROP TABLE {0}".format(tmptable))
    
                if not self._importSettings['ConfigOnly']:
                    print('Updating view')
                    Utils.UpdateTableInfoView(self._workspaceId, tableid, allowSubSampling, cur)
    
                cur.commit()
    
            print('Creating custom summary values')
            for property in properties:
                propid = property['propid']
                settings = property['Settings']
                if settings.HasToken('SummaryValues'):
                    with self._logHeader('Creating summary values for custom data {0}'.format(tableid)):
                        summSettings = settings.GetSubSettings('SummaryValues')
                        if settings.HasToken('minval'):
                            summSettings.AddTokenIfMissing('MinVal', settings['minval'])
                        summSettings.AddTokenIfMissing('MaxVal', settings['maxval'])
                        destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', self._datasetId, propid)
                        if not os.path.exists(destFolder):
                            os.makedirs(destFolder)
                        dataFileName = os.path.join(destFolder, propid)
    
                        if not isPositionOnGenome:
                            raise Exception('Summary values defined for non-position table')
    
                        if not self._importSettings['ConfigOnly']:
                            self._log('Extracting data to '+dataFileName)
                            script = ImpUtils.SQLScript(self._calculationObject)
                            script.AddCommand("SELECT {2} as chrom, {3} as pos, {0} FROM {1} ORDER BY {2},{3}".format(
                                DBCOLESC(propid),
                                DBTBESC(Utils.GetTableWorkspaceView(self._workspaceId, tableid)),
                                DBCOLESC(chromField),
                                DBCOLESC(posField)
                            ))
                            script.Execute(self._datasetId, dataFileName)
                            self._calculationObject.LogFileTop(dataFileName, 5)
    
                        ImpUtils.CreateSummaryValues_Value(
                            self._calculationObject,
                            summSettings,
                            self._datasetId,
                            tableid,
                            'custom',
                            self._workspaceId,
                            propid,
                            settings['Name'],
                            dataFileName,
                            self._importSettings
                        )
                        
 
    
    def _getDataList(self, table):

        name = 'CustomData'
        
        settings, props = self._fetchCustomSettings(None, table, False)
        
        customdatalist = None
        
        if settings is not None and settings.HasToken(name):
            if not type(settings[name]) is list:
                raise Exception(name + ' token should be a list')
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

    
    
    def importAllCustomData(self, tableMap):
    
        print('Scanning for custom data in {}'.format(self._workspaceId))
    
        workspaces = self._getTables()
        print('Importing custom data')
        if len(workspaces) == 0:
            print('No custom data: skipping')
            return
                
        for table in workspaces:
            #Only use of table map
            if not table in tableMap:
                raise Exception('Invalid table id '+table)
                        
            self._folder = os.path.join(self._datatablesFolder,self._dataDir,table)
                        
            tabs = self._getDataList(table)
            
            for sourceid in tabs:
                self._sourceId = sourceid
                self.ImportCustomData(sourceid, table)
                

       
            
