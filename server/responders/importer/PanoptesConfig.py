from __future__ import print_function
from future import standard_library
standard_library.install_aliases()
from builtins import str
from builtins import object
import configparser
from io import StringIO
import os
import config
from DQXDbTools import ToSafeIdentifier
from configparser import NoOptionError
        
class PanoptesConfig(object):
    
    def __init__ (self, calculationObject):
               
        self._calculationObject = calculationObject

        self._config = configparser.ConfigParser(allow_no_value= True)
        self._globalSectionName = 'Global'
        self._importSectionName = 'Import DB Credentials'
        global config
        configFile = os.path.abspath(config.__file__).rstrip('c')
        newConfig = os.path.join(os.path.dirname(configFile), 'panoptes.cfg')
        dummySection = ''
        if os.path.isfile(newConfig):
            configFile = newConfig
        else:
            dummySection = "[" + self._globalSectionName + "]\n"
        
        #self._log(configFile)
        
        #A section name is required so add one
        with open(configFile) as stream:
            content = dummySection + stream.read()
            #Keep the settings we've read for debugging purposes later
            self._content = content
            #content = stream.read()
        #    self._log(content)
            fakefile = StringIO(content)
            self._config.readfp(fakefile)
        
        if not self._config.has_section(self._importSectionName):
            self._importSectionName = self._globalSectionName
    
    def _getGlobalVar(self, name, optional = False):
        var = None
        try:
            var = self._config.get(self._globalSectionName, name).strip("'\"")
        except NoOptionError:
            print("Missing setting:" + name)
            if optional:
                pass
            else:
                print("Global settings:" + str(self._config.items(self._globalSectionName)))
                print("Import settings:" + str(self._config.items(self._importSectionName)))
                print(self._content)
                raise 
        
        return var      
               
    def getImportConnectionSettings(self, db = None):
        db_args = {
            'host': 'localhost'
        }
        
        db_args['user'] = 'monetdb'
        db_args['password'] = 'monetdb'

        if db != None:
            useDB = db
        else:
            useDB = 'datasets'

        db_args['database'] = ToSafeIdentifier(useDB)
        
        return db_args
    
    def getSourceDataDir(self):
        return self._getGlobalVar('SOURCEDATADIR')

    def getBaseDir(self):
        return self._getGlobalVar('BASEDIR')
    
    def getPluginPath(self):
        return self._getGlobalVar('PLUGINPATH', True)
    
    def getCasService(self):
        return self._getGlobalVar('CAS_SERVICE', True)

    def getCasLogout(self):
        return self._getGlobalVar('CAS_LOGOUT_PAGE', True)

    def getMasterDbName(self):
        return 'datasets'
            