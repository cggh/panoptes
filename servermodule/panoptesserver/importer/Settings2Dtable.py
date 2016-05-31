# -*- coding: utf-8 -*-
from __future__ import print_function
from ImportSettings import ImportSettings
from collections import OrderedDict

class Settings2Dtable(ImportSettings):
    
    def getSettings(self):
        twoDtableSettings = OrderedDict((
                    ('NameSingle', {
                               'type': 'Text',
                               'required': True,
                               'description': 'Display name referring to data of an individual cell (single, without starting capital)'
                            }),
                    ('NamePlural', {
                               'type': 'Text',
                               'required': True,
                               'description': 'Display name referring to data of several cells (plural, without starting capital)'
                            }),
                    ('Description', {
                               'type': 'Text',
                               'required': False,
                               'default': '',
                               'description': 'A short description of this 2D data table.\n  Note: this text may contain documentation links (see :ref:`def-source-docs`)'
                            }),
                    ('ColumnDataTable', {
                         'type': 'Text',
                         'required': True,
                         'description': 'Identifier of the (1D) data table defining the columns of the matrix\n  (In case of genotype data: the variants). This links the 2D data table to the 1D data table containing the column information'
                         }),
                    ('ColumnIndexField', {
                         'type': 'Text',
                         'required': True,
                         'description': 'The property ID in the ``ColumnDataTable`` data table that maps into the ``ColumnIndexArray``\n  array in the HDF5 source file. ``ColumnIndexField`` and ``ColumnIndexArray`` together establish the link between the column data table values, and the data present in the HDF5 source file.\n  Alternatively ``ColumnIndexArray`` can be omitted implying that the columns in HDF5 are in the same order as ``ColumnIndexField`` sorted.\n  Note that "AutoKey" can be used if your rows do not have Unique IDs'
                         }),
                    ('ColumnIndexArray', {
                         'type': 'Text',
                         'required': False,
                         'description': '1D Array in the HDF5 source file that gives the value of ``ColumnIndexField`` for each column.\n  If this is omitted then it is assumed that the HDF5 columns are in the same\n  order as the ``ColumnDataTable`` data table, sorted by the ``ColumnIndexField`` property'
                         }),
                    ('RowDataTable', {
                         'type': 'Text',
                         'required': True,
                         'description': 'Identifier of the (1D) data table defining the rows of the matrix\n  (in case of genotype data: the samples). This links the 2D data table to the 1D data table containing the row information'
                         }),
                    ('RowIndexField', {
                         'type': 'Text',
                         'required': True,
                         'description': 'The property ID in the ``RowDataTable`` data table that maps into ``RowIndexArray``\n  array in the HDF5 source file. ``RowIndexField`` and ``RowIndexArray`` together establish the link between the row data table values, and the data present in the HDF5 source file.\n  Alternatively ``RowIndexArray`` can be omitted implying that the rows in HDF5 are in the same order as ``RowIndexField`` sorted.\n  Note that "AutoKey" can be used if your rows do not have Unique IDs'
                         }),
                    ('RowIndexArray', {
                         'type': 'Text',
                         'required': False,
                         'description': '1D Array in the HDF5 source file that gives the value of ``RowIndexField`` for each row.\n  If this is omitted then it is assumed that the HDF5 columns are in the same\n  order as the ``RowDataTable`` data table, sorted by the ``RowIndexField property``'
                         }),
                    ('FirstArrayDimension', {
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
                    ('SymlinkData', {
                         'type': 'Boolean',
                         'required': False,
                         'default': False,
                         'description': 'If true then the HDF5 source file will not be copied but only symlinked. Note that if your HDF5 doesn’t have small enough chunking (max few MB per chunk) then performance will suffer. The default of False copies and rechunks the HDF5'
                         }),
                    ('ShowInGenomeBrowser', {
                         'type': 'Block',
                         'required': False,
                         'description': "If this key is present, the data will be visualised as a channel in the genome browser.\n  This requires that data table used as ``ColumnDataTable`` is defined as " + '"IsPositionOnGenome"' + " (see :ref:`def-settings-datatable`)\n  This key contains the following subkeys, Either 'Call' or 'AlleleDepth' or both must be present",
                         'children': OrderedDict((
                                      ('Call', {
                                               'type': 'PropertyID',
                                               'required': False,
                                               'description': 'Reference to the 2D data table property that contains call information'
                                               }),
                                      ('AlleleDepth', {
                                               'type': 'PropertyID',
                                               'required': False,
                                               'description': 'Reference to the 2D data table property that contains depth information'
                                               }),
                                      ('ExtraProperties', {
                                               'type': 'PropertyIDList',
                                               'required': False,
                                               'description': 'A list of the extra 2D data table properties that are displayed in the genotype channel. This will populate options for alpha and height control'
                                               })
                                      ))
                         }),
                    ('GenomeMaxViewportSizeX', {
                         'type': 'Value',
                         'required': False,
                         'description': 'Maximum size of the genome browser viewport (in bp) for which genotype calls will be displayed'
                         }),
                    ('Properties', {
                         'type': 'List',
                         'required': True,
                         'description': 'Contains a list of all properties defined for each cell of the 2D data table',
                         'children': OrderedDict((
                                      ('Id', {
                                             'type': 'Text',
                                             'required': True,
                                             'description': 'Identifier of the property, and name of the dataset in the HDF5 source file'
                                             }),
                                      ('Name', {
                                                'type': 'Text',
                                                'required': False,
                                                'description': 'Display name of the property'
                                                }),
                                      ('Description', {
                                                       'type': 'Text',
                                                       'required': False,
                                                       'description': 'Short description of this property'
                                                       }),
                                      ('MinVal', {
                                                 'type': 'Value',
                                                 'required': False,
                                                 'description': 'For continuous properties the lower level at which values will be clipped on display'
                                                 }),
                                      ('MaxVal', {
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
