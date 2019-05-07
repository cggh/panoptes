from __future__ import print_function
from __future__ import absolute_import
from builtins import str
from builtins import object
import os
from . import ImportSettings
import simplejson
import logging
import sys
from .SettingsDAO import SettingsDAO
from .PanoptesConfig import PanoptesConfig
from .SettingsDataTable import SettingsDataTable
from .Settings2Dtable import Settings2Dtable
from .SettingsDataset import SettingsDataset

class BaseImport(object):
    
    def __init__ (self, calculationObject, datasetId, importSettings, baseFolder = None, dataDir = 'datatables'):
        
        self._calculationObject = calculationObject
        self._config = PanoptesConfig(self._calculationObject)
        
        self._datasetId = datasetId
        self._importSettings = importSettings
        self._dataDir = dataDir
        
        if (baseFolder == None):
            baseFolder = os.path.join(self._config.getSourceDataDir(), 'datasets')

        self._datasetFolder = os.path.join(baseFolder, self._datasetId)
        
        if dataDir == 'datatables':
            self._tablesToken = 'DataTables'
            self._settingsLoader = SettingsDataTable()
        elif dataDir == '2D_datatables':
            self._tablesToken = '2D_datatables'
            self._settingsLoader = Settings2Dtable()
        else:
            raise Exception('dataDir must be either datatables or 2D_datatables')
      
        self._dataFile = 'data'
        self._viewFile = 'view'
        
        if dataDir == 'datatables':
            datasetFolder = os.path.join(baseFolder, datasetId)
            self._datatablesFolder = os.path.join(datasetFolder, dataDir)
        elif dataDir == '2D_datatables':
            datasetFolder = os.path.join(baseFolder, datasetId)
        
            self._datatablesFolder = os.path.join(datasetFolder, dataDir)
            self._dataFile = 'data.zarr'

        settingsFile = os.path.join(self._datasetFolder, 'settings')
        if os.path.isfile(settingsFile):
            self._globalSettings = SettingsDataset(settingsFile, False)
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
        
        self._dao = SettingsDAO(self._calculationObject, self._datasetId)

    #This changes the message displayed in the Server calcuations section on the web page
    def setInfo(self, message):
        self._calculationObject.SetInfo(message)
        
    def copy (self, src):
        
        self._calculationObject = src._calculationObject
        self._datasetId = src._datasetId
        self._importSettings = src._importSettings
        self._dataDir = src._dataDir
        self._datasetFolder = src._datasetFolder
        self._tablesToken = src._tablesToken
        self._dataFile = src._dataFile
        self._datatablesFolder = src._datatablesFolder
        self._globalSettings = src._globalSettings
        self._maxLineCount = src._maxLineCount

        
    def __str__(self):
        return ("datasetFolder {} datatablesFolder {} datasetId {} tablesToken {} dataDir {}".format(
                self._datasetFolder, self._datatablesFolder,self._datasetId, self._tablesToken, self._dataDir))
    
    def _getImportSetting(self, name):
        ret = None
        if name in self._importSettings:
            ret = self._importSettings[name]
        return ret
    
    #Return the list of tables to process either as specified in the settings file or by looking at the directories
    def _getTables(self):
        ret = []
        views = [] #Do them last as they depend on non-view tables
        
        self._log(str(self))
        if self._globalSettings[self._tablesToken]:
            ret = self._getGlobalSettingList(self._tablesToken)
        else:
            if not os.path.exists(os.path.join(self._datasetFolder, self._dataDir)):
                return ret
            for folder in os.listdir(os.path.join(self._datasetFolder, self._dataDir)):
                if os.path.isdir(os.path.join(self._datasetFolder, self._dataDir, folder)):
                    if os.path.exists(os.path.join(self._datasetFolder, self._dataDir, folder, 'view')):
                        views.append(folder)
                    else:
                        ret.append(folder)
        return ret + views
    
    def _getGlobalSettingList(self, name):
        retval = None
        if self._globalSettings is not None and self._globalSettings[name]:
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
            self._log("Missing settings file {} from {} {} {}".format(settings, self._datatablesFolder, datatable))
#            raise Exception("Missing settings {}".format(settings))
        data = os.path.join(folder, self._dataFile)
        if not os.path.isfile(data):
            data1 = data + '.gz'
            if os.path.isfile(data1):
                self._dataFile = self._dataFile + '.gz'
            else:
                self._log("Missing data file {} from {} {} {}".format(data, self._datatablesFolder, datatable))
#                raise Exception("Missing data {}".format(data))
        
        return settings, data
     
    def _getDataFiles(self, datatable):
                
        folder = os.path.join(self._datatablesFolder, datatable)
            
        settings = os.path.join(folder, 'settings')
#        self._log("BaseImport._getDataFiles",settings)
#        self._log("BaseImport._getDataFiles",str(self))
        if not os.path.isfile(settings):
            self._log("Missing settings file {} from {} {} ".format(settings, self._datatablesFolder, datatable))
#            raise Exception("Missing settings {}".format(settings))
        view = os.path.join(folder, self._viewFile)
        if os.path.isfile(view):
            return settings, view, True
        data = os.path.join(folder, self._dataFile)
        data_gz = data + '.gz'
        data_hdf = data + '.hdf5'
        data_zarr = data + '.zarr'
        if os.path.isfile(data):
            pass
        elif os.path.isfile(data_gz):
            self._dataFile = self._dataFile + '.gz'
            data = data_gz
        elif os.path.isfile(data_hdf):
                self._dataFile = self._dataFile + '.hdf5'
                data = data_hdf
        else:
                if not os.path.isfile(data):
                    self._log("Missing data file {} from {} {} ".format(data, self._datatablesFolder, datatable))
    #                raise Exception("Missing data {}".format(data))
        
        return settings, data, False
    
    def _fetchSettings(self, datatable):
                
        settings, data, isView = self._getDataFiles(datatable)
        
        tableSettings = self._settingsLoader
        tableSettings.loadFile(settings)
        #self._log("Loaded importsettings")
        #tableSettings = SettingsLoader.SettingsLoader(settings, False)
                
        return tableSettings

    def _getDatasetFolders(self, datatables):
        
        subDir = 'datatables'
        
        if datatables == None:
            datatables = []
            
        for directory in os.listdir(os.path.join(self._datasetFolder, subDir)):
            if os.path.isdir(os.path.join(self._datasetFolder, subDir, directory)):
                if directory not in datatables:
                    datatables.append(directory)
        
        print('Data tables: ' + str(datatables))
        return datatables

    def _getImportDir(self, datatable):
        subDir = 'datatables'
        return os.path.join(self._datasetFolder, subDir, datatable)
    
    #This is overridden by classes that operate a multi-threading model 
    def _log(self, message):
        self._calculationObject.Log(message)
        
    def _logHeader(self, message):
        self.setInfo(message)
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
class CalcLogHeader(object):
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

