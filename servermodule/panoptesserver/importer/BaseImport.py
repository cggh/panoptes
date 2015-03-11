import os
import ImpUtils
import SettingsLoader
import config
import DQXDbTools
import simplejson
import logging
import sys
import warnings

class BaseImport(object):
    
    def __init__ (self, calculationObject, datasetId, importSettings, workspaceId = None, baseFolder = None, dataDir = 'datatables'):
        
        global config
        
        self._calculationObject = calculationObject
        self._datasetId = datasetId
        self._workspaceId = workspaceId
        self._importSettings = importSettings
        self._dataDir = dataDir
        
        if (baseFolder == None):
            baseFolder = os.path.join(config.SOURCEDATADIR, 'datasets')

        self._datasetFolder = os.path.join(baseFolder, self._datasetId)
        
        if dataDir == 'datatables':
            self._tablesToken = 'DataTables'
        elif dataDir == 'customdata':
            self._tablesToken = 'CustomData'
        elif dataDir == '2D_datatables':
            self._tablesToken = '2D_datatables'
        elif dataDir == 'workspaces':
            self._tablesToken = 'workspaces'
        else:
            raise Exception('dataDir must be either datatables, customdata workspaces, or 2D_datatables')
      
        self._dataFile = 'data'
        
        if dataDir == 'datatables' or dataDir == 'workspaces':  
            datasetFolder = os.path.join(baseFolder, datasetId)
        
            self._datatablesFolder = os.path.join(datasetFolder, dataDir)
        elif dataDir == 'workspaces':
            datasetFolder = os.path.join(baseFolder,datasetId, self._workspaceId)
            self._datatablesFolder = os.path.join(datasetFolder, dataDir)
        elif dataDir == '2D_datatables':
            datasetFolder = os.path.join(baseFolder, datasetId)
        
            self._datatablesFolder = os.path.join(datasetFolder, dataDir)
            self._dataFile = 'data.hdf5'
        elif dataDir == 'customdata':
            self._datatablesFolder = os.path.join(baseFolder, self._workspaceId)           
            self._datasetFolder = self._datatablesFolder
            
        settingsFile = os.path.join(self._datasetFolder, 'settings')
        if os.path.isfile(settingsFile):
            self._globalSettings = SettingsLoader.SettingsLoader(settingsFile, False)
        else:
            self._globalSettings = None
            
        self._maxLineCount = -1
        if importSettings['ScopeStr'] == '1k':
            self._maxLineCount = 1000
        if importSettings['ScopeStr'] == '10k':
            self._maxLineCount = 10000
        if importSettings['ScopeStr'] == '100k':
            self._maxLineCount = 100000
        if importSettings['ScopeStr'] == '1M':
            self._maxLineCount = 1000000
        if importSettings['ScopeStr'] == '10M':
            self._maxLineCount = 10000000

        self._isMPI = False

        self._logMessages = []
        self._logId = ''

        #It's a bit messy but links up with python logging e.g. for using exceptions
        if self._calculationObject.logfilename is not None:
            logging.basicConfig(filename=self._calculationObject.logfilename)
        else:
            logging.basicConfig(stream=sys.stdout, level='DEBUG')
        #This allows the use of the python logging api
        self._logger = logging.getLogger()


    def copy (self, src):
        
        self._calculationObject = src._calculationObject
        self._datasetId = src._datasetId
        self._workspaceId = src._workspaceId
        self._importSettings = src._importSettings
        self._dataDir = src._dataDir
        self._datasetFolder = src._datasetFolder
        self._tablesToken = src._tablesToken
        self._dataFile = src._dataFile
        self._datatablesFolder = src._datatablesFolder
        self._globalSettings = src._globalSettings
        self._maxLineCount = src._maxLineCount

        
    def __str__(self):
        return ("datasetFolder {} datatablesFolder {} datasetId {} workspaceId {} tablesToken {} dataDir {}".format(
                self._datasetFolder, self._datatablesFolder,self._datasetId, self._workspaceId, self._tablesToken, self._dataDir))
    
    def _getImportSetting(self, name):
        ret = None
        if name in self._importSettings:
            ret = self._importSettings[name]
        return ret
    
    #Return the list of tables to process either as specified in the settings file or by looking at the directories
    def _getTables(self):
        ret = []
        
        self._log(str(self))
        if self._globalSettings and self._globalSettings.HasToken(self._tablesToken):
            ret = self._getGlobalSettingList(self._tablesToken)
        else:
            if not os.path.exists(os.path.join(self._datasetFolder, self._dataDir)):
                return ret
            for folder in os.listdir(os.path.join(self._datasetFolder, self._dataDir)):
                if os.path.isdir(os.path.join(self._datasetFolder, self._dataDir, folder)):
                    ret.append(folder)            

        return ret
    
    def _getGlobalSettingList(self, name):
        retval = None
        if self._globalSettings is not None and self._globalSettings.HasToken(name):
            if not type(self._globalSettings[name]) is list:
                raise Exception(name + ' token should be a list')
            retval = self._globalSettings[name]
        return retval
   
    def _getCustomSettings(self, source, datatable):
        
        folder = os.path.join(self._datatablesFolder,self._dataDir,datatable)
        if source is not None:
            f = os.path.join(folder,source)
            folder = f
            
        settings = os.path.join(folder, 'settings')
        self._log(settings)
        self._log(str(self))
        if not os.path.isfile(settings):
            self._log("Missing settings file {} from {} {} {}".format(settings, self._datatablesFolder, datatable, self._workspaceId))
#            raise Exception("Missing settings {}".format(settings))
        data = os.path.join(folder, self._dataFile)
        if not os.path.isfile(data):
            data1 = data + '.gz'
            if os.path.isfile(data1):
                self._dataFile = self._dataFile + '.gz'
            else:
                self._log("Missing data file {} from {} {} {}".format(data, self._datatablesFolder, datatable, self._workspaceId))
#                raise Exception("Missing data {}".format(data))
        
        return settings, data
     
    def _getDataFiles(self, datatable):
                
        folder = os.path.join(self._datatablesFolder, datatable)
            
        settings = os.path.join(folder, 'settings')
#        self._log("BaseImport._getDataFiles",settings)
#        self._log("BaseImport._getDataFiles",str(self))
        if not os.path.isfile(settings):
            self._log("Missing settings file {} from {} {} {}".format(settings, self._datatablesFolder, datatable, self._workspaceId))
#            raise Exception("Missing settings {}".format(settings))
        data = os.path.join(folder, self._dataFile)
        if not os.path.isfile(data):
            data1 = data + '.gz'
            if os.path.isfile(data1):
                self._dataFile = self._dataFile + '.gz'
            else:
                self._log("Missing data file {} from {} {} {}".format(data, self._datatablesFolder, datatable, self._workspaceId))
#                raise Exception("Missing data {}".format(data))
        
        return settings, data
    
    def _fetchCustomSettings(self, source, datatable, includeProperties = True):
                
        settings, data = self._getCustomSettings(source, datatable)
        
        tableSettings = None
        if not os.path.isfile(settings):
            self._log("Missing settings file {} from {} {} {}".format(settings, self._datatablesFolder, datatable, self._workspaceId))
        else:
            tableSettings = SettingsLoader.SettingsLoader(settings, False)

        properties = None
        if includeProperties:
            properties = ImpUtils.LoadPropertyInfo(self._calculationObject, tableSettings, data)
        
        return tableSettings, properties
    
    def _fetchSettings(self, datatable, includeProperties = True, log = False):
                
        settings, data = self._getDataFiles(datatable)
        
        tableSettings = SettingsLoader.SettingsLoader(settings, False)

        properties = None
        if includeProperties:
            properties = ImpUtils.LoadPropertyInfo(self._calculationObject, tableSettings, data, log)
                
        return tableSettings, properties

    def _getDatasetFolders(self, datatables):
        
        subDir = 'datatables'
        for directory in os.listdir(os.path.join(self._datasetFolder, subDir)):
            if os.path.isdir(os.path.join(self._datasetFolder, subDir, directory)):
                if directory not in datatables:
                    datatables.append(directory)
        
        print 'Data tables: ' + str(datatables)
        return datatables

    def _getImportDir(self, datatable):
        subDir = 'datatables'
        return os.path.join(self._datasetFolder, subDir, datatable)
    
    def _execSqlQuery(self, sql):
        return(ImpUtils.ExecuteSQLQuery(self._calculationObject, self._datasetId, sql))
    
    def _execSql(self, sql):
        ImpUtils.ExecuteSQL(self._calculationObject, self._datasetId, sql)

    def _dropTable(self, tableName, cur = None):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            stmt = 'DROP TABLE IF EXISTS {0}'.format(tableName)
            if cur is None:
                self._execSql(stmt)
            else:
                cur.execute(stmt)

    def _dropView(self, tableName):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self._execSql('DROP VIEW IF EXISTS {0}'.format(tableName))

    def _getTablesInfo(self, tableid = None):
        tables = []
        if tableid == None:
            sql = 'SELECT id, primkey, settings FROM tablecatalog'
        else:
            sql = 'SELECT id, primkey, settings FROM tablecatalog WHERE id="{0}"'.format(tableid)
        with DQXDbTools.DBCursor(self._calculationObject.credentialInfo, self._datasetId) as cur:  
            cur.execute(sql)
            tables = [ { 'id': row[0], 'primkey': row[1], 'settingsStr': row[2] } for row in cur.fetchall()]
            
            for table in tables:
                tableSettings = SettingsLoader.SettingsLoader()
                tableSettings.LoadDict(simplejson.loads(table['settingsStr'], strict=False))
                table['settings'] = tableSettings
                
        return tables
    #This is overridden by classes that operate a multi-threading model 
    def _log(self, message):
        self._calculationObject.Log(message)
        
    def _logHeader(self, message):
        return CalcLogHeader(self, message)

#        return self._calculationObject.LogHeader(message)
    def setMPI(self, value):
        if value:
            if self._calculationObject.logfilename is not None:
                from mpi4py import MPI
                comm = MPI.COMM_WORLD   # get MPI communicator object
                mode = MPI.MODE_WRONLY|MPI.MODE_CREATE#|MPI.MODE_APPEND 
                self._logFH = MPI.File.Open(comm, self._calculationObject.logfilename, mode) 
                self._logFH.Set_atomicity(True) 
                self._logFH.Write_shared(str(comm.rank) + self._calculationObject.logfilename + ' file opened\n')
#            else:
#                raise Exception('Must specify a logfile when using MPI')
        self._isMPI = value

    def isMPI(self):
        return self._isMPI 

import DQXUtils
#This is repeated from servermodule/panoptesserver/asyncresponder.py due to the different requirements around logging
#with the multi-threaded/MPI approach
class CalcLogHeader:
    def __init__(self, calcObject, title):
        self.calcObject = calcObject
        self.title = title
        self.calcObject._log('==>' + self.title)
        self.timer = DQXUtils.Timer()
    def __enter__(self):
        return None
    def __exit__(self, type, value, traceback):
        if value is None:
            self.calcObject._log('<==Finished {0} (Elapsed: {1:.1f}s)'.format(self.title, self.timer.Elapsed()))

