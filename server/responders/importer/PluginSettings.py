from __future__ import absolute_import
from .ImportSettings import ImportSettings

class PluginSettings(ImportSettings):
    
    def setSettings(self, settingsDef):
        self._settingsDef = settingsDef
        
    def getSettings(self):
        if hasattr(self, '_settingsDef'):
            return self._settingsDef
        else:
            return None