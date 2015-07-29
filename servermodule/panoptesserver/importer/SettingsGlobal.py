# -*- coding: utf-8 -*-

from SettingsDataset import SettingsDataset
import simplejson

class SettingsGlobal(SettingsDataset):
    
        
    def saveGlobalSettings(self, calculationObject, datasetId):

        for token in self._settings.keys():
            st = self._settings[token]
    
            if token == 'IntroSections':
                for sect in st:
                    if 'Content' in sect:
                        sect['Content'] = sect['Content'].replace('\r', '\\r').replace('\n', '\\n').replace('"', '\\"')
    
            if (type(st) is list) or (type(st) is dict):
                st = simplejson.dumps(st)

            from SettingsDAO import SettingsDAO                
            dao = SettingsDAO(calculationObject, datasetId, None)
            dao.saveSettings(token, st)
