# -*- coding: utf-8 -*-
from __future__ import print_function
from ImportSettings import ImportSettings
from collections import OrderedDict

class Settings2Dtable(ImportSettings):
    
    def getSettings(self):
        twoDtableSettings = OrderedDict((
                    ('nameSingle', {
                               'type': 'Text',
                               'required': True,
                               'description': 'Display name referring to data of an individual cell (single, without starting capital)'
                            }),
                    ('namePlural', {
                               'type': 'Text',
                               'required': True,
                               'description': 'Display name referring to data of several cells (plural, without starting capital)'
                            }),
                    ('description', {
                               'type': 'Text',
                               'required': False,
                               'default': '',
                               'description': 'A short description of this 2D data table.\n  Note: this text may contain documentation links (see :ref:`def-source-docs`)'
                            }),
                    ('columnDataTable', {
                         'type': 'Text',
                         'required': True,
                         'description': 'Identifier of the (1D) data table defining the columns of the matrix\n  (In case of genotype data: the variants). This links the 2D data table to the 1D data table containing the column information'
                         }),
                    ('columnIndexField', {
                         'type': 'Text',
                         'required': True,
                         'description': 'The property ID in the ``columnDataTable`` data table that maps into the ``columnIndexArray``\n  array in the HDF5 source file. ``columnIndexField`` and ``columnIndexArray`` together establish the link between the column data table values, and the data present in the HDF5 source file.\n  Alternatively ``columnIndexArray`` can be omitted implying that the columns in HDF5 are in the same order as ``columnIndexField`` sorted.\n  Note that "AutoKey" can be used if your rows do not have Unique IDs'
                         }),
                    ('columnIndexArray', {
                         'type': 'Text',
                         'required': False,
                         'description': '1D Array in the HDF5 source file that gives the value of ``columnIndexField`` for each column.\n  If this is omitted then it is assumed that the HDF5 columns are in the same\n  order as the ``columnDataTable`` data table, sorted by the ``columnIndexField`` property'
                         }),
                    ('rowDataTable', {
                         'type': 'Text',
                         'required': True,
                         'description': 'Identifier of the (1D) data table defining the rows of the matrix\n  (in case of genotype data: the samples). This links the 2D data table to the 1D data table containing the row information'
                         }),
                    ('rowIndexField', {
                         'type': 'Text',
                         'required': True,
                         'description': 'The property ID in the ``rowDataTable`` data table that maps into ``rowIndexArray``\n  array in the HDF5 source file. ``rowIndexField`` and ``rowIndexArray`` together establish the link between the row data table values, and the data present in the HDF5 source file.\n  Alternatively ``rowIndexArray`` can be omitted implying that the rows in HDF5 are in the same order as ``rowIndexField`` sorted.\n  Note that "AutoKey" can be used if your rows do not have Unique IDs'
                         }),
                    ('rowIndexArray', {
                         'type': 'Text',
                         'required': False,
                         'description': '1D Array in the HDF5 source file that gives the value of ``rowIndexField`` for each row.\n  If this is omitted then it is assumed that the HDF5 columns are in the same\n  order as the ``rowDataTable`` data table, sorted by the ``rowIndexField property``'
                         }),
                    ('firstArrayDimension', {
                         'type': 'Text',
                         'required': False,
                         'description': "Either 'row' or 'column' to indicate the first dimension in the HDF5 array.\n  'column' will generally perform better",
                         'values':  OrderedDict(( 
                                     ('row', {
                                                 'description': ''
                                                 }),
                                     ('column', {
                                                 'description': ''
                                                 })
                                     ))
                         }),
                    ('symlinkData', {
                         'type': 'Boolean',
                         'required': False,
                         'default': False,
                         'description': 'If true then the HDF5 source file will not be copied but only symlinked. Note that if your HDF5 doesn’t have small enough chunking (max few MB per chunk) then performance will suffer. The default of False copies and rechunks the HDF5'
                         }),
                    ('showInGenomeBrowser', {
                         'type': 'Block',
                         'required': False,
                         'description': "If this key is present, the data will be visualised as a channel in the genome browser.\n  This requires that data table used as ``columnDataTable`` is defined as " + '"IsPositionOnGenome"' + " (see :ref:`def-settings-datatable`)\n  This key contains the following subkeys, Either 'Call' or 'AlleleDepth' or both must be present",
                         'children': OrderedDict((
                                      ('call', {
                                               'type': 'PropertyID',
                                               'required': False,
                                               'description': 'Reference to the 2D data table property that contains call information'
                                               }),
                                      ('alleleDepth', {
                                               'type': 'PropertyID',
                                               'required': False,
                                               'description': 'Reference to the 2D data table property that contains depth information'
                                               }),
                                      ('extraProperties', {
                                               'type': 'PropertyIDList',
                                               'required': False,
                                               'description': 'A list of the extra 2D data table properties that are displayed in the genotype channel. This will populate options for alpha and height control'
                                               })
                                      ))
                         }),
                    ('genomeMaxViewportSizeX', {
                         'type': 'Value',
                         'required': False,
                         'description': 'Maximum size of the genome browser viewport (in bp) for which genotype calls will be displayed'
                         }),
                    ('properties', {
                         'type': 'List',
                         'required': True,
                         'description': 'Contains a list of all properties defined for each cell of the 2D data table',
                         'children': OrderedDict((
                                      ('id', {
                                             'type': 'Text',
                                             'required': True,
                                             'description': 'Identifier of the property, and name of the dataset in the HDF5 source file'
                                             }),
                                      ('name', {
                                                'type': 'Text',
                                                'required': False,
                                                'description': 'Display name of the property'
                                                }),
                                      ('description', {
                                                       'type': 'Text',
                                                       'required': False,
                                                       'description': 'Short description of this property'
                                                       }),
                                      ('minVal', {
                                                 'type': 'Value',
                                                 'required': False,
                                                 'description': 'For continuous properties the lower level at which values will be clipped on display'
                                                 }),
                                      ('maxVal', {
                                                 'type': 'Value',
                                                 'required': False,
                                                 'description': 'For continuous properties the upper level at which values will be clipped on display'
                                                 })
                                      ))
                         })
                    ))
  
        return twoDtableSettings

    def _getDocHeader(self):
        return '''.. _YAML: http://www.yaml.org/about.html

.. _def-settings-twoddatatable:

2D Datatable settings
~~~~~~~~~~~~~~~~~~~~~


This YAML_ file contains settings for a :ref:`2D data table<dataconcept_twoddatatable>`. See also:

- :ref:`data-import-settings`
- :ref:`def-source-twoddatatable`
- `Example file
  <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Genotypes/2D_datatables/genotypes/settings>`_

Possible keys
.............
'''
        
    def _getDocFilename(self):
        return 'documentation/importdata/importsettings/twoddatatable.rst'
