# -*- coding: utf-8 -*-
from __future__ import print_function
from collections import OrderedDict
from SettingsDataTable import SettingsDataTable
import copy

class SettingsCustomData(SettingsDataTable):
    
    def getSettings(self):
        parentSettings = SettingsDataTable.getSettings(self)
        #copy is used for settings that will be modified
        customDataSettings = OrderedDict([('propertyGroups', parentSettings['propertyGroups']),
                                          ('properties', copy.deepcopy(parentSettings['properties'])),
                                          ('dataItemViews', copy.deepcopy(parentSettings['dataItemViews'])),
                                         ('customData', {
                                                      'type': 'List',
                                                      'required': False,
                                                      'description': 'Optionally, an explicit list of custom data can be specified to control the order of import'
                                                      })])
        customDataSettings["properties"]["required"] = False
        #Is a list of property Ids in the parent table but since we don't have this info
        customDataSettings["dataItemViews"]["children"]["fields"]["type"] = 'List'

        return customDataSettings
        

    def _getDocHeader(self):
        return '''.. _YAML: http://www.yaml.org/about.html

.. _def-settings-customdata:

Custom data settings
~~~~~~~~~~~~~~~~~~~~
This YAML_ file contains settings for a :ref:`custom data source<dataconcept_customdata>`. See also:

- :ref:`data-import-settings`
- :ref:`data-import-addcustomdata`
- `Example file
  <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/workspaces/workspace_1/customdata/samples/SampleMetaData/settings>`_

Possible keys
.............

'''
        
    def _getDocFilename(self):
        return 'documentation/importdata/importsettings/customdata.rst'
