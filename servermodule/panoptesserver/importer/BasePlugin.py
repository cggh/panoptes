import ImpUtils
from PluginSettings import PluginSettings

class BasePlugin:
    
    def __init__(self, calculationObject, datasetId, settings, dirPath):
        self._dirPath = dirPath
        self._calculationObject = calculationObject
        self._datasetId = datasetId
        settingsDef = self._getSettingsDef()
        self._log("Loading plugin settings from " + settings)
        if settingsDef != None:
            self._plugin_settings = PluginSettings(settings, settingsDef = settingsDef)
    
    def _getSettingsDef(self):
        return None
        
    def _log(self, message):
        self._calculationObject.Log(message)
        
    def _execSql(self, sql):
        ImpUtils.ExecuteSQL(self._calculationObject, self._datasetId, sql)
        
    def generateDocs(self):
        
        f = open('documentation/importdata/importsettings/' + self.__class__.__name__ + '.rst', 'w')
        
        settingsDef = self._getSettingsDef()
        for key in settingsDef:
            detail = settingsDef[key]
            self._printProperty(key, detail, f)

        f.close()