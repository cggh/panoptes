import os
import ImpUtils
import SettingsLoader
import config

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
            self._globalSettings = SettingsLoader.SettingsLoader(settingsFile)
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

        
    def __str__(self):
        return ("datasetFolder {} datatablesFolder {} datasetId {} workspaceId {} tablesToken {} dataDir {}".format(
                self._datasetFolder, self._datatablesFolder,self._datasetId, self._workspaceId, self._tablesToken, self._dataDir))
    
    def _getImportSetting(self, name):
        return self._importSettings[name]
    
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
        
        return settings, data
     
    def _getDataFiles(self, datatable):
                
        folder = os.path.join(self._datatablesFolder, datatable)
            
        settings = os.path.join(folder, 'settings')
        self._log(settings)
        self._log(str(self))
        if not os.path.isfile(settings):
            self._log("Missing settings file {} from {} {} {}".format(settings, self._datatablesFolder, datatable, self._workspaceId))
#            raise Exception("Missing settings {}".format(settings))
        data = os.path.join(folder, self._dataFile)
        
        return settings, data
    
    def _fetchCustomSettings(self, source, datatable, includeProperties = True):
                
        settings, data = self._getCustomSettings(source, datatable)
        
        tableSettings = None
        if not os.path.isfile(settings):
            self._log("Missing settings file {} from {} {} {}".format(settings, self._datatablesFolder, datatable, self._workspaceId))
        else:
            tableSettings = SettingsLoader.SettingsLoader(settings)

        properties = None
        if includeProperties:
            properties = ImpUtils.LoadPropertyInfo(self._calculationObject, tableSettings, data)
        
        return tableSettings, properties
    
    def _fetchSettings(self, datatable):
                
        settings, data = self._getDataFiles(datatable)
        
        tableSettings = SettingsLoader.SettingsLoader(settings)

        properties = ImpUtils.LoadPropertyInfo(self._calculationObject, tableSettings, data)
        
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
        
    def _log(self, message):
        self._calculationObject.Log(message)
        
    def _logHeader(self, message):
        return self._calculationObject.LogHeader(message)
