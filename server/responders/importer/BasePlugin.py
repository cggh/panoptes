from __future__ import absolute_import
from builtins import object
from . import ImpUtils
from .PluginSettings import PluginSettings
from .PanoptesConfig import PanoptesConfig
from .SettingsDAO import SettingsDAO

class BasePlugin(object):
    
    def __init__(self, calculationObject, datasetId, settings, dirPath):
        self._dirPath = dirPath
        self._calculationObject = calculationObject
        self._config = PanoptesConfig(calculationObject)
        self._dao = SettingsDAO(calculationObject, datasetId)
        self._datasetId = datasetId
        settingsDef = self.getSettings()
        self._log("Loading plugin settings from " + settings)
        if settingsDef != None:
            self._plugin_settings = PluginSettings()
            self._plugin_settings.setSettings(settingsDef)
            self._plugin_settings.loadFile(settings)
    
    def getSettingsDef(self):
        return None
        
    def _log(self, message):
        self._calculationObject.Log(message)
        
    def _execSql(self, sql):
        self._dao._execSql(sql)
        
        
    def generateDocs(self):
        
        f = open('documentation/importdata/importsettings/' + self.__class__.__name__ + '.rst', 'w')
        
        settingsDef = self._getSettingsDef()
        for key in settingsDef:
            detail = settingsDef[key]
            self._printProperty(key, detail, f)

        f.close()