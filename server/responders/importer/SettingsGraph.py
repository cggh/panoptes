# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import absolute_import
from .ImportSettings import ImportSettings
from collections import OrderedDict

class SettingsGraph(ImportSettings):
    
    def getSettings(self):
        graphSettings = OrderedDict((
                              ('name', {
                                        'type': 'Text',
                                        'required': True,
                                        'description': ''
                                        }),
                              ('format', {
                                        'type': 'Text',
                                        'required': True,
                                        'description': '',
                                        'values': { 'newick': {
                                                                           'description': ''
                                                                           }}
                                        }),
                              ('description', {
                                        'type': 'Text',
                                        'required': True,
                                        'description': ''
                                        }),
                              ('crossLink', {
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
