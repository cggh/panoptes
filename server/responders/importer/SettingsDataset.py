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
                                    ('description', {
                                          'type': 'Text',
                                          'required': False,
                                          'description': '''A description of the dataset that appears on the start page.
  Note: this text may contain html markup, and documentation links (see :ref:`def-source-docs`).
  A longer description can be split over several lines by writing a ``>`` sign on the key line,
  and indent subsequent lines::

     Description: >
        This web application provides an interactive view
        on the data ..'''}),
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
                                    })
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