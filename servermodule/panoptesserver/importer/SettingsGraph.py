# -*- coding: utf-8 -*-
from __future__ import print_function
from ImportSettings import ImportSettings
from collections import OrderedDict

class SettingsGraph(ImportSettings):
    
    def getSettings(self):
        graphSettings = OrderedDict((
                              ('Name', {
                                        'type': 'Text',
                                        'required': True,
                                        'description': ''
                                        }),
                              ('Format', {
                                        'type': 'Text',
                                        'required': True,
                                        'description': '',
                                        'values': { 'newick': {
                                                                           'description': ''
                                                                           }}
                                        }),
                              ('Description', {
                                        'type': 'Text',
                                        'required': True,
                                        'description': ''
                                        }),
                              ('CrossLink', {
                                        'type': 'Text',
                                        'required': False,
                                        'default': '',
                                        'description': ''
                                        })
                              ))
  
        return graphSettings

    def _getDocHeader(self):
        return ''
        
    def _getDocFilename(self):
        return 'documentation/importdata/importsettings/graph.rst'
