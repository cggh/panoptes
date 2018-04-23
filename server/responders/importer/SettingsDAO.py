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
from Numpy_to_SQL import Numpy_to_SQL
import pymonetdb.control

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
                
    def __updateConnectionSettings(self, dbCursor, local_file = 0, database = None):
        dbCursor.db_args = self._config.getImportConnectionSettings(database)
        #local_file option not supported by monet
        # dbCursor.db_args.update({'local_infile': local_file})
    
    #Think carefully before using outside this class
    def getDBCursor(self, local_files = 0):
        dbCursor = DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId)
        self.__updateConnectionSettings(dbCursor, local_file = local_files, database = self._datasetId)
        
        return dbCursor
        
    def _execSqlQuery(self, sql, *args):
        self._log('SQLQuery:' + (self._datasetId or 'no dataset') + ';' + sql % args)
        
        with self.getDBCursor() as cur:
            cur.execute(sql, args)
            return cur.fetchall()
    
    def _execSql(self, sql, *args):
        self._log(repr('SQL:' + (self._datasetId or 'no dataset') +';'+sql % args))

        dbCursor = DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId)
        self.__updateConnectionSettings(dbCursor, local_file = 0, database = self._datasetId)
        
        with self.getDBCursor() as cur:
            cur.db.set_autocommit(True)
            cur.execute(sql, args)

    def createDatabase(self):
        
        db = self._datasetId
        self._datasetId = None
        
        DQXUtils.CheckValidDatabaseIdentifier(db)
        control = pymonetdb.control.Control(passphrase='monetdb')
        try:
            control.stop(db)
        except pymonetdb.exceptions.OperationalError:
            pass
        try:
            control.destroy(db)
        except pymonetdb.exceptions.OperationalError:
            pass
        control.create(db)
        control.release(db)
        self._datasetId = db
        self._execSql('CREATE SCHEMA "%s"' % db)
        self._execSql('ALTER USER "monetdb" SET SCHEMA "%s"' % db)
        self._execSql('SET SCHEMA "%s"' % db)

    def setDatabaseVersion(self, major, minor):
        self._checkPermissions('settings', None)
        self._execSql("INSERT INTO settings VALUES ('DBSchemaVersion', %s)", str(major) + "." + str(minor))
    
    def getCurrentSchemaVersion(self):
        self._checkPermissions('settings', None)
        rs = self._execSqlQuery('SELECT content FROM settings WHERE id="DBSchemaVersion"')
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
        self.__updateConnectionSettings(dbCursor, local_file = 0, database = self._datasetId)
        
        with dbCursor as cur:
            cur.db.set_autocommit(False)
            
            sql_parts = sqlparse.split(commands)
            i = 0
            for sql_part in sql_parts:
                if sql_part.strip() ==  '':
                    continue 
                if i < 5:
                    self._log('SQL:' + self._datasetId+';'+sql_part[:1000])
                if i == 5:
                    self._log('SQL:' + self._datasetId+'; Commands truncated...')
                i = i + 1
                cur.execute(sql_part)
            cur.commit()
                
    #Use with care!
    def loadFile(self, filename):
        sql = open(filename).read()
        self._multiStatementExecSql(sql)
                
    def dropTable(self, tableid, cur = None):
        self._checkPermissions('', tableid)
        
        try:
            self._execSql('DROP TABLE {}'.format(DBTBESC(tableid)))
        except:
            pass

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
        self._execSql('DELETE FROM datasetindex WHERE id=%s', db)
        self._datasetId = db
    
    
    def clearDatasetCatalogs(self):
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'settings'))
        self._execSql("DELETE FROM settings WHERE id<>'DBSchemaVersion'")

    def insertGraphForTable(self, tableid, graphid, graphSettings):
        self._checkPermissions('graphs', tableid)
        crosslink = graphSettings['crossLink']

        self._execSql("INSERT INTO graphs (graphid, tableid, tpe, dispname, settings, crosslnk) VALUES (%s, %s, %s, %s, %s, %s)", graphid,
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
            

    def insert2DIndexes(self, zarr_file, dimension, tableid, table_settings, primKey, max_line_count):
        
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
                index = zarr_file[table_settings[indexArray]]
            except KeyError:
                raise Exception("zarr doesn't contain {0} at the root".format(table_settings[indexArray]))
            for prop in table_settings['properties']:
                if len(index) != zarr_file[prop['id']].shape[0 if dimension == 'column' else 1]:
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
            sql = 'ALTER TABLE "{0}" ADD "{2}_{3}_index" INT DEFAULT NULL;'.format(
                table_settings[dataTable],
                table_settings[indexField],
                tableid,
                dimension)
            self._execSql(sql)

            #We have a datatable - add an index to it then copy that index across to the data table
            self._execSql('alter table "{}" add column "index" int auto_increment;'.format(tempTable))
            sql = """UPDATE "{0}" SET "{2}_{4}_index" = (select "{3}"."index"-1 from "{3}" where "{0}"."{1}" = "{3}"."{1}") ;
                     """.format(
                table_settings[dataTable],
                table_settings[indexField],
                tableid,
                tempTable,
                dimension)
            self._execSql(sql)
            self.dropTable(tempTable)
            #Now check we have no NULLS
    
            sql = 'SELECT "{1}_{2}_index" from "{0}" where "{1}_{2}_index" IS NULL'.format(
                table_settings[dataTable],
                tableid,
                dimension)
            nulls = self._execSqlQuery(sql)
            if len(nulls) > 0:
                print("WARNING: Not all {2} in {0} have a corresponding {2} in 2D datatable {1}".format(table_settings[dataTable], tableid, dimension))

        else:
            #Add an index to the table - catch the exception if it exists.
            sql = 'ALTER TABLE "{0}" ADD "{2}_{3}_index" INT DEFAULT NULL;'.format(
                table_settings[dataTable],
                table_settings[indexField],
                tableid,
                dimension)
            self._execSql(sql)

            #We don't have an array of keys into a column so we are being told the data in zarr is in the same order as sorted "ColumnIndexField" so we index by that column in order
            sql = 'create table "index" as select "{5}", row_number() over (order by "{1}")-1 as "rowNum" from "{0}" with data;' \
                  'update "{0}" set {2}_{3}_index=(select "rowNum" from "index" where "index"."{5}"="{0}"."{5}");' \
                  'drop table "index";'
            #
            sql = sql.format(
                table_settings[dataTable],
                table_settings[indexField],
                tableid, dimension, max_line_count, primKey)
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
