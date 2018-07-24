# -*- coding: utf-8 -*-
from __future__ import print_function
from ImportSettings import ImportSettings
from collections import OrderedDict

class SettingsDataset(ImportSettings):
    
    def getSettings(self):
            datasetSettings = OrderedDict((
                                    ('name', {
                                          'type': 'Text',
                                          'required': True,
                                          'description': 'The visible name of the dataset, as it appears on the intro page'}),
                                    ('nameBanner', {
                                          'type': 'Text',
                                          'required': False,
                                          'description': 'Visible name of the dataset, as it appears on the top banner of the app.\n  Note: this text may contain html markup'}),
                                    ('version', {
                                          'type': 'Text',
                                          'required': False,
                                          'description': 'Visible version of the dataset, as it may appear in the app.\n  Note: this text may contain HTML markup.'}),
                                    ('dataTables', {
                                          'type': 'List',
                                          'required': False,
                                          'description': '''A list of the data table identifiers in the dataset.
  These names should correspond to directory names in the *datatables* source directory (see :ref:`def-source-datatable`).
  This can be included in the settings in order to provide an explicit ordering of the data tables in the app.
  If this key is not provided, a default ordering wil be used'''}),
                                    ('twoD_DataTables', {
                                                       'type': 'List',
                                                       'required': False,
                                                       'description': 'List the 2D data tables that should be exposed in the app'
                                                       }),
                                    ('googleAnalyticsId', {
                                                            'type': 'Text',
                                                            'required': False,
                                                            'description': ''
                                                            }),
                                    ('initialSessionState', {
                                        'type': 'Block',
                                        'required': False,
                                        'description': 'The default tabs, popups and recently used genes and queries for a new session. Most easily set by using the save button on the header (only shown to managers)',
                                        'default': {
                                            'session': {
                                                'components': {
                                                    'FirstTab': {
                                                        'type': 'EmptyTab',
                                                    }
                                                },
                                                'tabs': {
                                                    'components': ['FirstTab'],
                                                    'selectedTab': 'FirstTab',
                                                    'unclosableTabs': ['FirstTab'],
                                                    'unreplaceableTabs': ['FirstTab']
                                                },
                                                'popups': {
                                                    'components': [],
                                                    'state': {}
                                                },
                                                'foundGenes': [],
                                                'usedTableQueries': [],
                                                'popupSlots': []
                                            }
                                        }
                                    }),
                                    ('topLevelComponent', {
                                        'type': 'Text',
                                        'required': False,
                                        'default': 'Panoptes',
                                        'description': 'The name of the React component to use at the top level, for deeply customising look-and-feel'
                                    }),
                                    ('genomeBrowserChannelSets', {
                                        'type': 'List',
                                        'required': False,
                                        'default': [],
                                        'description': 'A list of exmaple channel configurations that will be shown on the genome browser sidebar',
                                        'children': {
                                            'name': {
                                                'type': 'Text',
                                                'required': True,
                                                'description': 'Channel set name'
                                            },
                                            'description': {
                                                'type': 'Text',
                                                'required': True,
                                                'description': 'Channel set description'
                                            },
                                            'channels': {
                                                'type': 'List',
                                                'required': True,
                                                'description': 'List of serialised channels'
                                            },
                                        }
                                    }),
                                    ('constants', {
                                        'type': 'Block',
                                        'required': False,
                                        'description': '''A dict of custom constants''',
                                        'default': {}
                                    }),
                                    ('feeds', {
                                        'type': 'Block',
                                        'required': False,
                                        'description': '''A list of feeds (RSS, Atom, etc.), their identifiers and their URLs, for the dataset.''',
                                    }),

            ))
            return datasetSettings

    def _getDocFilename(self):
        return 'documentation/importdata/importsettings/dataset.rst'
    
    def _getDocHeader(self):
        return '''.. _YAML: http://www.yaml.org/about.html


.. _def-settings-dataset:

General dataset settings
~~~~~~~~~~~~~~~~~~~~~~~~
This YAML_ file contains settings for a :ref:`dataset<dataconcept_dataset>`. See also:

- :ref:`data-import-settings`
- :ref:`data-import-adddataset`
- `Example file
  <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/settings>`_


Possible keys
.............
'''