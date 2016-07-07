# -*- coding: utf-8 -*-
from __future__ import print_function
from ImportSettings import ImportSettings
from collections import OrderedDict

class SettingsWorkspace(ImportSettings):
    
    def getSettings(self):
        graphSettings = OrderedDict((
                              ('name', {
                                        'type': 'Text',
                                        'required': True,
                                        'description': ''
                                        }),
                              ('customData', {
                                        'type': 'Text',
                                        'required': False,
                                        'description': ''
                                        })
                              ))
  
        return graphSettings

    def _getDocHeader(self):
        return ''
        
    def _getDocFilename(self):
        return 'documentation/importdata/importsettings/graph.rst'
