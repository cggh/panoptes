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
from _mysql import OperationalError, ProgrammingError
from Numpy_to_SQL import Numpy_to_SQL


class SettingsDAO(object):
    
    def __init__ (self, calculationObject, datasetId, logCache = None):
               
        self._calculationObject = calculationObject
        self._datasetId = datasetId

        self._config = PanoptesConfig(self._calculationObject)
        
        self._logCache = logCache 
    
    def _log(self, message):
        if self._logCache:
            self._logCache.append(message)
        else:
            #self._calculationObject.Log(message)
            self._calculationObject.LogSQLCommand(message)
                
    def __updateConnectionSettings(self, dbCursor, local_file = 0, db = None):
        dbCursor.db_args = self._config.getImportConnectionSettings(db)
        dbCursor.db_args.update({'local_infile': local_file})
    
    #Think carefully before using outside this class
    def getDBCursor(self, local_files = 0):
        dbCursor = DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId)
        self.__updateConnectionSettings(dbCursor, local_file = local_files, db = self._datasetId)
        
        return dbCursor
        
    def _execSqlQuery(self, sql, *args):
        self._log('SQLQuery:' + (self._datasetId or 'no dataset') + ';' + sql % args)
        
        with self.getDBCursor() as cur:
            cur.execute(sql, args)
            return cur.fetchall()
    
    def _execSql(self, sql, *args):
        self._log('SQL:' + (self._datasetId or 'no dataset') +';'+sql % args)

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
        rs = self._execSqlQuery("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA  WHERE SCHEMA_NAME='{}'".format(ToSafeIdentifier(db)))
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
                self._log('DROP TABLE IF EXISTS {}'.format(DBTBESC(tableid)))
                cur.execute(stmt)

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
        self._execSql('DELETE FROM datasetindex WHERE id="{0}"'.format(db))
        self._datasetId = db
    
    
    def clearDatasetCatalogs(self):
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'settings'))
        self._execSql('DELETE FROM settings WHERE id<>"DBSchemaVersion"')

    def insertGraphForTable(self, tableid, graphid, graphSettings):
        self._checkPermissions('graphs', tableid)
        crosslink = graphSettings['crossLink']

        self._execSql("INSERT INTO graphs (`graphid`, `tableid`, `tpe`, `dispname`, `settings`, `crosslnk`, `ordr`) VALUES (%s, %s, %s, %s, %s, %s, 0)", graphid, 
            tableid, 
            'tree', 
            graphSettings['name'],
            graphSettings.serialize(), 
            crosslink)


    def deleteGraphsForTable(self, tableid):
        self._checkPermissions('graphs', tableid)
        
        self._execSql("DELETE FROM graphs WHERE tableid=%s",tableid)
    
    def dropColumns(self, table, columns):
        sql = "ALTER TABLE {0} ".format(DBTBESC(table))
        for prop in columns:
            if prop != columns[0]:
                sql += ", "
            sql += "DROP COLUMN {0}".format(DBCOLESC(prop))
        
        self._execSql(sql)
    
    def createIndex(self, indexName, tableid, columns, unique = False):
        cols = columns.split(",")
        modifier = ''
        if unique:
            modifier = 'UNIQUE'

        self._execSql('create ' + modifier + ' index {} ON {}({})'.format(DBCOLESC(indexName), DBTBESC(tableid), ",".join(map(DBCOLESC, cols))))
            

    def insert2DIndexes(self, remote_hdf5, dimension, tableid, table_settings, max_line_count):
        
        DQXUtils.CheckValidTableIdentifier(tableid)

        if dimension == "row":
            indexArray = 'rowIndexArray'
            indexField = 'rowIndexField'
            dataTable = 'rowDataTable'
            tempTable = 'tempRowIndex'
        else:
            indexArray = 'columnIndexArray'
            indexField = 'columnIndexField'
            dataTable = 'columnDataTable'
            tempTable = 'tempColIndex'
        if table_settings[indexArray]:
            #We have an array that matches to a column in the 1D SQL, we add an index to the 1D SQL
            #Firstly create a temporary table with the index array
            try:
                index = remote_hdf5[table_settings[indexArray]]
            except KeyError:
                raise Exception("HDF5 doesn't contain {0} at the root".format(table_settings[indexArray]))
            for prop in table_settings['properties']:
                if len(index) != remote_hdf5[prop['id']].shape[0 if dimension =='column' else 1]:
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
                
    def registerDataset(self, name, configOnly):
        importtime = 0
        if not configOnly:
            importtime = time.time()
        db = self._datasetId
        self._datasetId = None
        self._execSql("INSERT INTO datasetindex VALUES (%s, %s, %s)", db, name, str(math.ceil(importtime)))
        self._datasetId = db
