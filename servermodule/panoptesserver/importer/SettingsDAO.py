import warnings
from SettingsDataTable import SettingsDataTable
try:
    import DQXDbTools
except:
    print('Failed to import DQXDbTools. Please add the DQXServer base directory to the Python path')
    sys.exit()
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
from DQXDbTools import DBDBESC
from DQXDbTools import ToSafeIdentifier
import DQXUtils
from PanoptesConfig import PanoptesConfig
import time
import math
import sqlparse
import sys
from _mysql import OperationalError, ProgrammingError
from Numpy_to_SQL import Numpy_to_SQL


class SettingsDAO(object):
    
    def __init__ (self, calculationObject, datasetId, workspaceId, logCache = None):
               
        self._calculationObject = calculationObject
        self._datasetId = datasetId
        self._workspaceId = workspaceId

        self._config = PanoptesConfig(self._calculationObject)
        
        self._logCache = logCache 
    
    def _log(self, message):
        if self._logCache:
            self._logCache.append(message)
        else:
            self._calculationObject.Log(message)
                
    def __updateConnectionSettings(self, dbCursor, local_file = 0, db = None):
        dbCursor.db_args = self._config.getImportConnectionSettings(db)
        dbCursor.db_args.update({'local_infile': local_file})
    
    #Think carefully before using outside this class
    def getDBCursor(self, local_files = 0):
        dbCursor = DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId)
        self.__updateConnectionSettings(dbCursor, local_file = local_files, db = self._datasetId)
        
        return dbCursor
        
    def _execSqlQuery(self, sql, *args):
        self._log('SQLQuery:' + self._datasetId + ';' + sql % args)
        
        with self.getDBCursor() as cur:
            cur.execute(sql, args)
            return cur.fetchall()
    
    def _execSql(self, sql, *args):
        self._log('SQL:' + str(self._datasetId) +';'+sql % args)

        dbCursor = DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId)
        self.__updateConnectionSettings(dbCursor, local_file = 0, db = self._datasetId)
        
        with self.getDBCursor() as cur:
            cur.db.autocommit(True)
            cur.execute(sql, args)
        

    #Function specifically for LOAD DATA LOCAL INFILE
    def _execSqlLoad(self, sql, *args):
        self._log('SQL:' + self._datasetId+';'+sql % args)

        with self.getDBCursor(local_files = 1) as cur:
            cur.db.autocommit(True)
            cur.execute(sql, args)

    def createDatabase(self):
        
        db = self._datasetId
        self._datasetId = None
        
        DQXUtils.CheckValidDatabaseIdentifier(db)
                
        try:
            self._execSql('DROP DATABASE IF EXISTS {}'.format(db))
        except:
            pass
        self._execSql('CREATE DATABASE {}'.format(db))
        self._datasetId = db
            
    def setDatabaseVersion(self, major, minor):
        self._checkPermissions('settings', None)
        self._execSql('INSERT INTO `settings` VALUES ("DBSchemaVersion", %s)', str(major) + "." + str(minor))
    
    def getCurrentSchemaVersion(self):
        self._checkPermissions('settings', None)
        rs = self._execSqlQuery('SELECT `content` FROM `settings` WHERE `id`="DBSchemaVersion"')
        if len(rs) > 0:
            majorversion = int(rs[0][0].split('.')[0])
            minorversion = int(rs[0][0].split('.')[1])
            return (majorversion, minorversion)
        else:
            return (0, 0)
                
    def isDatabasePresent(self):
        db = self._datasetId
        self._datasetId = None
        #Check existence of database
        rs = self._execSqlQuery("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA  WHERE SCHEMA_NAME=".format(DBDBESC(db)))
        if len(rs) == 0:
            raise Exception('Database does not yet exist. Please do a full import or top N preview import.')

        self._datasetId = db


    def _multiStatementExecSql(self, commands):
        
        dbCursor = DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId)
        self.__updateConnectionSettings(dbCursor, local_file = 0, db = self._datasetId)
        
        with dbCursor as cur:
            cur.db.autocommit(False)
            
            sql_parts = sqlparse.split(commands)
            i = 0
            for sql_part in sql_parts:
                if sql_part.strip() ==  '':
                    continue 
                if i < 5:
                    self._log('SQL:' + self._datasetId+';'+sql_part)
                if i == 5:
                    self._log('SQL:' + self._datasetId+'; Commands truncated...')
                i = i + 1
                cur.execute(sql_part)
            cur.commit()
                
    #Use with care!
    def loadFile(self, filename):
        #Can't use source as it's part of the mysql client not the API
        sql = open(filename).read()
        self._multiStatementExecSql(sql)
                
    def dropTable(self, tableid, cur = None):
        self._checkPermissions('', tableid)
        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            stmt = 'DROP TABLE IF EXISTS {}'.format(DBTBESC(tableid))
            if cur is None:
                self._execSql(stmt)
            else:
                cur.execute(stmt)

    def dropView(self, tableid):
        self._checkPermissions('', tableid)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self._execSql('DROP VIEW IF EXISTS {}'.format(DBTBESC(tableid)))
            
    #Check if the user has permission to write
    #The settingsTable is the global table
    #tableid is the name of a configured table in 'datatables'
    def _checkPermissions(self, settingsTable, tableid):
        if not (tableid == '-' or tableid == None):
            DQXUtils.CheckValidTableIdentifier(tableid)
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, tableid))
        if not settingsTable == '':
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, settingsTable))

    def removeDatasetMasterRef(self):
        config = PanoptesConfig(self._calculationObject)
        indexDb = config.getMasterDbName()
        
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(indexDb, 'datasetindex'))
        
        db = self._datasetId
        self._datasetId = indexDb
    # Remove current reference in the index first: if import fails, nothing will show up
        self._execSql('DELETE FROM datasetindex WHERE id="{0}"'.format(self._datasetId))
        self._datasetId = db
    
    
    def clearDatasetCatalogs(self):
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'propertycatalog'))
        self._execSql('DELETE FROM propertycatalog')
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'summaryvalues'))
        self._execSql('DELETE FROM summaryvalues')
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'tablecatalog'))
        self._execSql('DELETE FROM tablecatalog')
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'settings'))
        self._execSql('DELETE FROM settings WHERE id<>"DBSchemaVersion"')
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'customdatacatalog'))
        self._execSql('DELETE FROM customdatacatalog')
    
       
    def getTablesInfo(self, tableid = None):

        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationRead(self._datasetId, 'settings'))
        if tableid == None:
            sql = 'SELECT id, primkey, settings FROM tablecatalog'
        else:
            sql = 'SELECT id, primkey, settings FROM tablecatalog WHERE id="{0}"'.format(tableid)
        rows = self._execSqlQuery(sql)
        

        tables = [ { 'id': row[0], 'primkey': row[1], 'settingsStr': row[2] } for row in rows]
        
        if not tableid is None and len(tables) != 1:
            raise Exception("Index Table " + tableid + " doesn't exist")
            
        for table in tables:
            tableSettings = SettingsDataTable()
            tableSettings.deserialize(table['settingsStr'])
            table['settings'] = tableSettings
            
        return tables
            
    def insertTableCatalogEntry(self, tableid, tableSettings, tableOrder):
        
        self._checkPermissions('tablecatalog', tableid)

        # Drop existing tablecatalog record
        sql = "DELETE FROM tablecatalog WHERE id=%s"
        self._execSql(sql, tableid)
    # Add to tablecatalog
        sql = "INSERT INTO tablecatalog (`id`, `name`, `primkey`, `IsPositionOnGenome`, `settings`, `defaultQuery`, `ordr`) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        
        self._execSql(sql, tableid, 
            tableSettings['NamePlural'], 
            tableSettings['PrimKey'], 
            tableSettings['IsPositionOnGenome'], 
            tableSettings.serialize(), 
            "", #defaultQuery
            tableOrder)

    def deletePropertiesForTable(self, tableid):
        self._checkPermissions('propertycatalog', tableid)
        
        self._execSql("DELETE FROM propertycatalog WHERE tableid=%s",tableid)


    def insertTableProperty(self, tableid, tableSettings, propid):
        self._checkPermissions('propertycatalog', tableid)
        
        sql = "INSERT INTO propertycatalog (`workspaceid`, `source`, `datatype`, `propid`, `tableid`, `name`, `ordr`, `settings`) VALUES ('', 'fixed', %s, %s, %s, %s, %s, %s)"
        
        self._execSql(sql, tableSettings.getPropertyValue(propid, 'DataType'), 
            propid, 
            tableid, 
            tableSettings.getPropertyValue(propid, 'Name'), 
            0, 
            tableSettings.serializeProperty(propid))

    def deleteRelationsForTable(self, tableid):
        self._checkPermissions('relations', tableid)
        
        self._execSql("DELETE FROM relations WHERE childtableid=%s", tableid)
        
    def insertTableRelation(self, tableid, tableSettings, propid):
        self._checkPermissions('relations', tableid)
        
        if 'Relation' in tableSettings.getProperty(propid):
            relationSettings = tableSettings.getPropertyValue(propid, 'Relation')
            self._log('Creating relation: {} {} {}'.format(relationSettings['TableId'], relationSettings['ForwardName'], relationSettings['ReverseName']))
            self._execSql("INSERT INTO relations (`childtableid`, `childpropid`, `parenttableid`, `parentpropid`, `forwardname`, `reversename`) VALUES (%s, %s, %s, %s, %s, %s)",
                          tableid, 
                          propid, 
                          relationSettings['TableId'], 
                          '', 
                          relationSettings['ForwardName'], 
                          relationSettings['ReverseName'])
            
            
    def insertGraphForTable(self, tableid, graphid, graphSettings):
        self._checkPermissions('graphs', tableid)
        crosslink = graphSettings['CrossLink']

        self._execSql("INSERT INTO graphs (`graphid`, `tableid`, `tpe`, `dispname`, `settings`, `crosslnk`, `ordr`) VALUES (%s, %s, %s, %s, %s, %s, 0)", graphid, 
            tableid, 
            'tree', 
            graphSettings['Name'], 
            graphSettings.serialize(), 
            crosslink)


    def deleteGraphsForTable(self, tableid):
        self._checkPermissions('graphs', tableid)
        
        self._execSql("DELETE FROM graphs WHERE tableid=%s",tableid)
    
    def deleteCustomDataCatalogEntry(self, sourceid, tableid):
        self._checkPermissions('customdatacatalog', tableid)
        self._execSql('DELETE FROM customdatacatalog WHERE tableid=%s and sourceid=%s',tableid, sourceid)


    def insertCustomDataSettings(self, sourceid, tableid, settings):
        self._checkPermissions('customdatacatalog', tableid)
        self._execSql("INSERT INTO customdatacatalog VALUES (%s, %s, %s)",tableid, sourceid, settings.serialize())


    def deleteFromWorkspacePropertyCatalog(self, tableid, prop):
        self._checkPermissions('propertycatalog', tableid)
        print 'Removing outdated information: {0} {1} {2}'.format(self._workspaceId, prop, tableid)

        self._execSql('DELETE FROM propertycatalog WHERE (workspaceid=%s) and (propid=%s) and (tableid=%s)',self._workspaceId, prop, tableid)


    def insertIntoWorkspacePropertyCatalog(self, tableid, propid, settings):
        self._checkPermissions('propertycatalog', tableid)
        self._execSql("INSERT INTO propertycatalog VALUES (%s, 'custom', %s, %s, %s, %s, %s, %s)",self._workspaceId, 
            settings.getPropertyValue(propid, 'DataType'), 
            propid, 
            tableid, 
            settings.getPropertyValue(propid, 'Name'), 
            0, 
            settings.serializeProperty(propid))
    
    def deleteSummaryValuesForTable(self, tableid):
        self._checkPermissions('summaryvalues', tableid)
        
        self._execSql("DELETE FROM summaryvalues WHERE tableid=%s",tableid)
            
    def insertSummaryValues(self, tableid, tableSettings, propid, sourceid):
        self._checkPermissions('summaryvalues', tableid)
        summSettings = tableSettings.getPropertyValue(propid, 'SummaryValues')
        name = tableSettings.getPropertyValue(propid, 'Name')

        self._execSql("DELETE FROM summaryvalues WHERE (propid=%s) and (tableid=%s) and (source=%s) and (workspaceid=%s)",propid, tableid, sourceid, self._workspaceId)

        self._execSql("INSERT INTO summaryvalues VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)", self._workspaceId or '', 
            sourceid, 
            propid, 
            tableid, 
            name, 
            tableSettings.getPropertyValue(propid, 'Order'), 
            tableSettings.serializeSummaryValues(propid), 
            tableSettings.getPropertyValue(propid, 'MinVal'), 
            tableSettings.getPropertyValue(propid, 'MaxVal'), 
            summSettings['BlockSizeMin'])

    def deleteTableBasedSummaryValuesForTable(self, tableid):
        self._checkPermissions('tablebasedsummaryvalues', tableid)
        self._execSql("DELETE FROM tablebasedsummaryvalues WHERE tableid=%s", tableid)


    def insertTableBasedSummaryValues(self, tableid, tableSettings, summaryid):
        self._checkPermissions('tablebasedsummaryvalues', tableid)
        
        self._execSql("INSERT INTO tablebasedsummaryvalues VALUES (%s, %s, %s, %s, %s, %s, %s, 0)", tableid, summaryid, 
            tableSettings.getTableBasedSummaryValue(summaryid)['Name'], 
            tableSettings.serializeTableBasedValue(summaryid), 
            tableSettings.getTableBasedSummaryValue(summaryid)['MinVal'], 
            tableSettings.getTableBasedSummaryValue(summaryid)['MaxVal'], 
            tableSettings.getTableBasedSummaryValue(summaryid)['BlockSizeMin'])


    def materializeView(self, tableSettings, indexedColumns, wstable):
        tmptable = '_tmptable_'
        self.dropTable(tmptable)
        self._execSql('CREATE TABLE {} as SELECT * FROM {}'.format(tmptable, DBTBESC(wstable)))
        for indexedColumn in indexedColumns:
            self.createIndex(indexedColumn, tmptable, indexedColumn)
        
        if tableSettings['IsPositionOnGenome']:
            self._log('Indexing chromosome,position on materialised view')
            self.createIndex('mt1_chrompos', tmptable, DBCOLESC(tableSettings['Chromosome']) + "," + DBCOLESC(tableSettings['Position']))
        self.dropView(wstable)
        self._execSql('RENAME TABLE {} TO {}'.format(tmptable, DBTBESC(wstable)))
        
    def createIndex(self, indexName, tableid, columns, unique = False):
        
        cols = columns.split(",")
        modifier = ''
        if unique:
            modifier = 'UNIQUE'

        self._execSql('create ' + modifier + ' index {} ON {}({})'.format(DBCOLESC(indexName), DBTBESC(tableid), ",".join(map(DBCOLESC, cols))))
            
    def createSubSampleTable(self, tableid, primKey, bulkLoad = False):
        self._log('Creating random data column')
        if bulkLoad == False:
            self._execSql("UPDATE %s SET _randomval_=RAND()",DBTBESC(tableid))
        sortRandTable = tableid + '_SORTRAND'
        self.dropTable(sortRandTable)

        self._execSql("CREATE TABLE {} LIKE {}".format(DBTBESC(sortRandTable), DBTBESC(tableid)))
        if primKey == "AutoKey":
            self._log('Restructuring AutoKey')
            self._execSql("alter table %s drop column AutoKey",DBTBESC(sortRandTable))
            self._execSql("alter table %s add column AutoKey int FIRST",DBTBESC(sortRandTable))
            self._execSql("create index idx_autokey on %s(AutoKey)",DBTBESC(sortRandTable))
        self._execSql("alter table {} add column RandPrimKey int AUTO_INCREMENT PRIMARY KEY".format(DBTBESC(sortRandTable)))
        
        # NOTE: there is little point in importing more than that!
        self._execSql("insert into {} select *,0 from {} order by _randomval_ LIMIT 5000000".format(DBTBESC(sortRandTable), DBTBESC(tableid)))
        
    def checkForColumn(self, table, column):
        try:
            idx_field = self._execSqlQuery("SELECT {} FROM {} LIMIT 1".format(DBCOLESC(column), DBTBESC(table)) )
        except:
            #raise Exception(column + " column index field doesn't exist in table " + table)
            raise
        
    def magic2D(self, remote_hdf5, dimension, tableid, table_settings, max_line_count):
        
        DQXUtils.CheckValidTableIdentifier(tableid)

        if dimension == "row":
            indexArray = 'RowIndexArray'
            indexField = 'RowIndexField'
            dataTable = 'RowDataTable'
            tempTable = 'TempRowIndex'
        else:
            indexArray = 'ColumnIndexArray'
            indexField = 'ColumnIndexField'
            dataTable = 'ColumnDataTable'
            tempTable = 'TempColIndex'
          
        if table_settings[indexArray]:  
            #We have an array that matches to a column in the 1D SQL, we add an index to the 1D SQL
            #Firstly create a temporary table with the index array
            try:
                index = remote_hdf5[table_settings[indexArray]]
            except KeyError:
                raise Exception("HDF5 doesn't contain {0} at the root".format(table_settings[indexArray]))
            for prop in table_settings['Properties']:
                if len(index) != remote_hdf5[prop['Id']].shape[0 if table_settings['FirstArrayDimension'] == dimension else 1]:
                    raise Exception("Property {0} has a different row length to the row index".format(property))
                
            self.dropTable(tempTable)
            if dimension == "row":
                idx = index
            else:
                idx = index[0:max_line_count]
               
            self._log("About to create table using Numpy_to_SQL") 
            
            commands = Numpy_to_SQL().create_table(tempTable, table_settings[indexField], idx)
            
            with self.getDBCursor() as cur:
                for i, command in enumerate(commands):
                    if i < 5:
                        self._log(self._datasetId+';'+command.func_closure[-1].cell_contents)
                    if i == 5:
                        self._log(self._datasetId+'; Commands truncated...')
                    command(cur)
                    cur.commit()
            self._log("Created table using Numpy_to_SQL")
    
            #Add an index to the table - catch the exception if it exists.
            sql = "ALTER TABLE `{0}` ADD `{2}_{3}_index` INT DEFAULT NULL;".format(
                table_settings[dataTable],
                table_settings[indexField],
                tableid,
                dimension)
            try:
                self._execSql(sql)
            except OperationalError as e:
                if e[0] != 1060:
                    raise e
                    
            #We have a datatable - add an index to it then copy that index across to the data table
            self._execSql("ALTER TABLE {} ADD `index` INT DEFAULT NULL;".format(DBTBESC(tempTable)))
            self._execSql("SELECT @i:=-1;UPDATE {} SET `index` = @i:=@i+1;".format(DBTBESC(tempTable)))
            sql = """UPDATE `{0}` INNER JOIN `{3}` ON `{0}`.`{1}` = `{3}`.`{1}` SET `{0}`.`{2}_{4}_index` = `{3}`.`index`;
                     """.format(
                table_settings[dataTable],
                table_settings[indexField],
                tableid,
                tempTable,
                dimension)
            self._execSql(sql)
            self.dropTable(tempTable)
            #Now check we have no NULLS
    
            sql = "SELECT `{1}_{2}_index` from `{0}` where `{1}_{2}_index` IS NULL".format(
                table_settings[dataTable],
                tableid,
                dimension)
            nulls = self._execSqlQuery(sql)
            if len(nulls) > 0:
                print("WARNING: Not all {2} in {0} have a corresponding {2} in 2D datatable {1}".format(table_settings[dataTable], tableid, dimension))

        else:
            #Add an index to the table - catch the exception if it exists.
            sql = "ALTER TABLE `{0}` ADD `{2}_{3}_index` INT DEFAULT NULL;".format(
                table_settings[dataTable],
                table_settings[indexField],
                tableid,
                dimension)
            try:
                self._execSql(sql)
            except OperationalError as e:
                if e[0] != 1060:
                    raise e

            #We don't have an array of keys into a column so we are being told the data in HDF5 is in the same order as sorted "ColumnIndexField" so we index by that column in order
            if max_line_count:
                sql = "SELECT @i:=-1;UPDATE `{0}` SET `{2}_{3}_index` = @i:=@i+1 ORDER BY `{1}` LIMIT {4};"
            else:
                sql = "SELECT @i:=-1;UPDATE `{0}` SET `{2}_{3}_index` = @i:=@i+1 ORDER BY `{1}`;"

            sql = sql.format(
                table_settings[dataTable],
                table_settings[indexField],
                tableid, dimension, max_line_count)
            self._execSql(sql)
    
    def saveSettings(self, token, st):
        self._checkPermissions('settings', None)
        self._execSql("INSERT INTO settings VALUES (%s, %s)", token, st)
                
    def deleteChromosomes(self):
        self._checkPermissions('chromosomes', None)
        self._execSql('DELETE FROM chromosomes')
        
    def registerDataset(self, name, configOnly):
        importtime = 0
        if not configOnly:
            importtime = time.time()
        db = self._datasetId
        self._datasetId = None
        self._execSql("INSERT INTO datasetindex VALUES (%s, %s, %s)", db, name, str(math.ceil(importtime)))
        self._datasetId = db
        
