# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import absolute_import
from .ImportSettings import ImportSettings
from collections import OrderedDict
import copy

class SettingsDataTable(ImportSettings):

    def getSettings(self):
        dataTableSettings = OrderedDict((
                         ('nameSingle', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Display name referring to a single table item (single, without starting capital)'
                                }),
                         ('namePlural', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Display name referring to several table items (plural, without starting capital)'
                                }),
                         ('description', {
                                   'type': 'Text',
                                   'required': False,
                                   'default': '',
                                   'description': 'A short description of this data table.\n  This text will appear on the intro page, and on the table view page of this data table.\n  Note: this text may contain documentation links (see :ref:`def-source-docs`)'
                                }),
                         ('icon', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'Specifies an icon that will be associated with the data table.\n  The icon name can be chosen from the list specified in http://fortawesome.github.io/Font-Awesome/icons/'
                                }),
                         ('hdfPath', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'If the data source is HDF5 then this can be used to specify the path within the HDF5 file to the arrays'
                                }),
                         ('isHidden', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'If set to true, the data table will not be displayed as a standalone entity\n  (i.e. not mentioned on the intro page and no tab)'
                                }),
                         ('primKey', {
                                   'type': 'PropertyID',
                                   'required': True,
                                   'description': "The primary key *property ID* for this table.\n  A data item *property* is a column in the TAB-delimited source file ``data``, and the *ID* corresponds to the column header.\n  The primary key should refer to a column containing a unique value for each record in the table.\n  Optionally, this parameter can be set to '``AutoKey``' to instruct the software to automatically generate a primary key"
                                }),
                         ('itemTitle', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'A  `handlebars <http://handlebarsjs.com/>`_ template. Defaults to the primary key.\n  The rendered template will be used when a data item title is needed'
                                }),
                         ('sortDefault', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'description': 'Specifies the property ID (i.e. column name in the ``data`` source file) used as the default sort field.'
                                }),
                         ('defaultQuery', {
                             'type': 'Text',
                             'required': False,
                             'description': 'Specifies the default query used thoughout the app for this table.'
                         }),
                         ('authProperty', {
                             'type': 'Text',
                             'required': False,
                             'description': 'Specifies the property ID (i.e. column name) which contains strings to be used to restrict access to rows of the table to given users. See also ``authGroups`` in the dataset settings, the strings in this column will be looked up in ``authGroups`` to determine which auth group gets to see which rows. If not set the table is readable by any user who has access to the dataset'
                         }),
                         ('storedQueries', {
                             'type': 'List',
                             'required': False,
                             'default': [],
                             'description': 'A list of queries to be displayed in the app for this table',
                             'children': {'query': {
                                 'type': 'Text',
                                 'required': True,
                                 'description': 'a query string'
                             },
                                 'name': {
                                     'type': 'Text',
                                     'required': True,
                                     'description': 'a display name for this query'
                                 }
                             }
                         }),
                         ('fetchRecordCount', {
                                              'type': 'Boolean',
                                              'required': False,
                                              'default': False,
                                              'description': ''
                                               }),
                         ('quickFindFields', {
                                   'type': 'PropertyIDs',
                                   'required': False,
                                   'description': 'The list of properties will be used by some tools in the software that allow the user to quickly find a (set of) item(s)'
                                }),
                         ('previewProperties', {
                             'type': 'PropertyIDs',
                             'required': False,
                             'description': 'The list of properties that will be shown (along with the primary key) when the item is previewed such as in genome browser '
                         }),
                         ('disableSubsets', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'If set, there will be no subsets options for this data table'
                                }),
                         ('disablePlots', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'If set, there will be no options to create plots for this data table'
                                }),
                         ('disableNotes', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'If set, it will not be possible to define notes for items in this data table'
                                }),
                         ('propertyGroups', {
                                   'type': 'List',
                                   'required': False,
                                   'default': [],
                                   'description': 'Each item in the list specifies a group of properties.\n  Property groups are used to combine sets of related properties into logical sections in the app',
                                   'children': { 'id': {
                                                             'type': 'Text',
                                                             'required': True,
                                                             'description': 'a unique identifier for the group'
                                                             },
                                                'name': {
                                                                'type': 'Text',
                                                                'required': True,
                                                                'description': 'a display name'
                                                                }
                                                }
                                }),
                         ('docProps', {
                                       'type': 'documentation',
                                       'description': '.. _Properties:'
                                       }),
                         ('properties', {
                                   'type': 'List',
                                   'required': True,
                                   'description': 'Each list item defines a :ref:`property<dataconcept_property>`, linked to a column in the TAB-delimited source file ``data``.\n  See :ref:`def-settings-datatable-properties` settings for an overview of the keys that can be used for each property in this list',
                                   'children': {} #Is self._propertiesDefault - set in constructor
                                }),
                         ('dataItemViews', {
                                   'type': 'List',
                                   'required': False,
                                   'description': 'Definitions of custom views that will appear in the popup for an individual data table item',
                                   'children': OrderedDict((
                                                            ('type', {
                                                             'type': 'Text',
                                                             'required': True,
                                                             'description': 'Identifier of the custom view type (can be Overview, PropertyGroup, FieldList, ItemMap, PieChartMap) See DataItemViews settings for more details about defining custom data item views',
                                                             'allowOtherValues': True,
                                                             'values':  OrderedDict((
                                                                        ('Overview', {
                                                                                 'description': 'Specifies the default data item view of Panoptes, including all fields'
                                                                        }),
                                                                        ('PropertyGroup', {
                                                                                 'description': 'Displays all properties that are member of a specific property group'
                                                                        }),
                                                                        ('FieldList', {
                                                                                 'description': 'Displays a selection of properties for the data item'
                                                                        }),
                                                                        ('ItemMap', {
                                                                                 'description': 'Displays the data item as a pin on a geographical map. Requires the presence of properties with data type GeoLongitude and GeoLatitude'
                                                                        }),
                                                                        ('PieChartMap', {
                                                                                 'description': '''Defines a view that shows a set of pie charts on a geographic map (see example). This is achieved by combining information from two data tables:

    A locations data table. Each item in this data table defines a location where a pie chart is displayed.
    The current data table (where the view is defined), which contains the sizes of the pies for each data item as column values.

A set of properties of the current table is used to define pie sizes on all pie charts. For each pie and location combination there should be a property in the data table, containing the relative size of that specific pie.'''
                                                                        }),
                                                                        ('Template', {
                                                                                      'description': 'A view that is defined by a template that is filled with row item properties'
                                                                                    })
                                                                        ))
                                                          }),
                                                ('Docs0', { 'type': 'documentation',
                                                                'description': '''Overview
::::::::
Specifies the default data item view of Panoptes, including all fields'''
                                                                }),

                                                ('name', {
                                                         'type': 'Text',
                                                         'required': True,
                                                         'description': 'Display name of this view'
                                                         }),
                                                ('Docs1', { 'type': 'documentation',
                                                                'description': '''Template
::::::::
A view that is defined by a template that is filled with row item properties'''
                                                                }),
                                                ('content', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'type', 'value': 'Template'},
                                                            'description': 'A `handlebars <http://handlebarsjs.com/>`_ template'
                                                            }),
                                                ('Docs2', { 'type': 'documentation',
                                                                'description': '''PropertyGroup
:::::::::::::
Displays all properties that are member of a specific property group''' }),
                                                ('groupId', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'type', 'value': 'PropertyGroup'},
                                                            'description': 'Identifier of the property group to display'
                                                            }),
                                                ('Docs3', { 'type': 'documentation',
                                                                'description': '''FieldList
:::::::::
Displays a selection of properties for the data item'''
                                                                }),
                                                ('introduction', {
                                                         'type': 'Text',
                                                         'siblingOptional': { 'name': 'type', 'value': 'FieldList'},
                                                         'description': 'A static text that will be displayed on top of this view'
                                                         }),
                                                ('fields', {
                                                           'type': 'PropertyIDList',
                                                            'siblingRequired': { 'name': 'type', 'value': 'FieldList'},
                                                           'description': 'Each item in this list specifies a property ID'
                                                           }),
                                                ('Docs4', { 'type': 'documentation',
                                                                'description': '''ItemMap
:::::::
Displays the data item as a pin on a geographical map.
Requires the presence of properties with data type ``GeoLongitude`` and ``GeoLatitude``'''
                                                                }),
                                                ('mapZoom', {
                                                            'type': 'Value',
                                                            'siblingRequired': [{ 'name': 'type', 'value': 'ItemMap'},{ 'name': 'type', 'value': 'PieChartMap'}],
                                                            'description': 'Start zoom factor of the map (integer, minimum value of 0)'
                                                            }),
                                                ('Docs5', { 'type': 'documentation',
                                                                'description': '''PieChartMap
:::::::::::
Defines a view that shows a set of pie charts on a geographic map
(see `example <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/datatables/variants/settings>`_).
This is achieved by combining information from two data tables:

- A locations data table. Each item in this data table defines a location where a pie chart is displayed.
- The current data table (where the view is defined), which contains the sizes of the pies for each data item as column values.

A set of properties of the current table is used to define pie sizes on all pie charts.
For each pie and location combination there should be a property in the data table,
containing the relative size of that specific pie'''
                                                                }),
                                                ('mapCenter', {
                                                            'type': 'Block',
                                                            'siblingRequired': { 'name': 'type', 'value': 'PieChartMap'},
                                                            'description': 'Specifies the map center in the start view',
                                                            'children': OrderedDict((
                                                                         ('longitude', {
                                                                                       'type': 'Value',
                                                                                       'required': True,
                                                                                       'description': 'Geographic longitude'
                                                                                       }),
                                                                         ('latitude', {
                                                                                       'type': 'Value',
                                                                                       'required': True,
                                                                                       'description': 'Geographic latitude'
                                                                                       })))
                                                            }),
                                                ('mapZoom', {
                                                            'type': 'Value',
                                                            'siblingRequired': [{ 'name': 'type', 'value': 'ItemMap'},{ 'name': 'type', 'value': 'PieChartMap'}],
                                                            'description': 'Start zoom factor of the map (integer, minimum value of 0)'
                                                            }),
                                                ('dataType', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'type', 'value': 'PieChartMap'},
                                                            'description': 'Type of values used to create the pie chart',
                                                            'values': {
                                                                       'Fraction': {
                                                                                    'type': 'Value',
                                                                                    'description': ''
                                                                                    }
                                                                       }
                                                            }),
                                                ('locationDataTable', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'type', 'value': 'PieChartMap'},
                                                            'description': 'ID of the data table containing the locations\n  (this table should have properties with ``GeoLongitude`` and ``GeoLatitude`` data types)'
                                                            }),
                                                ('locationSizeProperty', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'type', 'value': 'PieChartMap'},
                                                            'description': 'Property ID of the locations data table containing the size of the pie chart'
                                                            }),
                                                ('locationNameProperty', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'type', 'value': 'PieChartMap'},
                                                            'description': 'Property ID of the locations data table containing the name of the pie chart'
                                                            }),
                                                ('componentColumns', {
                                                            'type': 'List',
                                                            'siblingRequired': { 'name': 'type', 'value': 'PieChartMap'},
                                                            'description': 'Enumerates all the pies displayed on the pie charts, and binds them to properties of this data table\n  (one for each combination of component x location)',
                                                            'children': OrderedDict((
                                                                         ('pattern', {
                                                                                     'type': 'Text',
                                                                                     'required': True,
                                                                                     'description': 'Property ID of the column providing the data.\n      NOTE: the token {locid} will be replaced by the primary key value of the records in the locations data table'
                                                                                     }),
                                                                         ('name', {
                                                                                     'type': 'Text',
                                                                                     'required': True,
                                                                                     'description': 'Display name of the pie'
                                                                                  }),
                                                                         ('color', {
                                                                                     'type': 'Text',
                                                                                     'required': True,
                                                                                     'description': 'Color of the pie. Format: ``rgb(r,g,b)``'
                                                                                   })))
                                                            }),
                                                ('residualFractionName', {
                                                            'type': 'Text',
                                                            'siblingOptional': { 'name': 'type', 'value': 'PieChartMap'},
                                                            'description': 'Name of the pie representing residual fraction (only applicable if the fractions do not sum up to 1)'
                                                            })
                                                ))
                                }),
                         ('externalLinks', {
                                   'type': 'List',
                                   'required': False,
                                   'description': 'Each item in the list specifies a link for a data item to an external url.\n  These links show up in the app as buttons in the data item popup window',
                                   'children': OrderedDict((
                                                ('url', {
                                                        'type': 'Text',
                                                        'required': True,
                                                        'description': '''Url for this link. This may include tokens property ID's between curly braces.
       These tokens will be expanded to their actual content for a specific data item.
       Example: ``http://maps.google.com/maps?q={Latitude},{Longitude}``'''
                                                        }),
                                                ('name', {
                                                        'type': 'Text',
                                                        'required': True,
                                                        'description': 'Display name for this external link'
                                                        })
                                                ))
                                }),
                         ('cacheTableInConfig', {
                             'type': 'Boolean',
                             'required': False,
                             'default': False,
                             'description': "If true the table data will be placed into dataset config in it's entirety, to be used in custom components and templates"
                         }),

                         ('listView', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': 'Replaces the normal table view with a list view, showing rows on left and a single selected row on the right'
                                }),
                         ('isPositionOnGenome', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': 'Instructs Panoptes that records in this data table should be interpreted as genomic positions.\n  In this case, the *Chromosome* and *Position* keys should be defined'
                                }),
                         ('isRegionOnGenome', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': 'Instructs Panoptes that records in this datatable should be interpreted as genomic regions.\n  In this case, the *Chromosome*, *RegionStart* and *RegionStop* keys should be defined'
                                }),
                         ('chromosome', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'default': 'chrom',
                                   'settingRequired': [{ 'name': 'isPositionOnGenome', 'value': True}, { 'name': 'isRegionOnGenome', 'value': True}],
                                   'description': 'Specifies the table column ID that contains the chromosome\n  (only to be used if *IsPositionOnGenome* or *IsRegionOnGenome* is set).\n  Note that the values in this column should correspond to the content of fasta file\n  (see :ref:`def-source-referencegenome`)'
                                }),
                         ('position', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'default': 'pos',
                                   'settingRequired': [{ 'name': 'isPositionOnGenome', 'value': True} ],
                                   'description': 'Specifies the table column ID that contains the position on the chromosome\n  (only to be used if *IsPositionOnGenome* is set)'
                                }),
                         ('regionStart', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'default': 'start',
                                   'settingRequired': { 'name': 'isRegionOnGenome', 'value': True},
                                   'description': 'Specifies the table column ID that contains the start position of the region\n  (only to be used if *IsRegionOnGenome* is set)'
                                }),
                         ('regionStop', {
                                   'type': 'PropertyID',
                                   'default': 'stop',
                                   'required': False,
                                   'settingRequired': { 'name': 'isRegionOnGenome', 'value': True},
                                   'description': 'Specifies the table column ID that contains the end position of the region\n  (only to be used if *IsRegionOnGenome* is set)'
                                }),
                         ('browserDefaultVisible', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'For genomic regions: specifies the default visibility status of this data table in the genome browser\n  (only to be used if *IsRegionOnGenome* is set).\n  Note that, for genomic position, default visibility is specified on a per-property basis'
                                }),
                         ('maxTableSize', {
                                   'type': 'Value',
                                   'required': False,
                                   'default': None,
                                   'description': ''
                                }),
                         ('browserDefaultLabel', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'description': 'Specifies the default label that is used in the genome browser, used for genomic regions.\n  None indicates that no label is displayed by default'
                                }),
                         ('tableBasedSummaryValues', {
                                   'type': 'List',
                                   'required': False,
                                   'default': [],

                                   'description': '''Declares that numerical genome values for are available for each item in the table.
  Panoptes will process these using the multiresolution filterbanking, and the user can display these as tracks in the genome browser.
  A typical use case is if the data table contains samples that were sequenced, and there is coverage data available

  *Approach 1*

  There should be a subdirectory named after the identifier of this track in the data table source data folder.
  For each data item, this directory should contain a data file with the name equal to the primary key
  (see `example <https://github.com/cggh/panoptes/tree/master/sampledata/datasets/Samples_and_Variants/datatables/samples/SampleSummary1>`_).
  The input files should not contain a header row

  The Id is the identifier of this set of per-data-item genomic values i.e. the name of the subdirectory

  *Approach 2*

  This approach is more like the way the table based data files are processed.
  In this case multiple tracks can be stored in the same input file.
  The Id corresponds to the column name instead of the directory name with the directory details given in the FilePattern expression
  The name is the first match in the FilePattern expression
''',
                                   'children': OrderedDict((
                                                ('id', {
                                                       'type': 'Text',
                                                       'required': True,
                                                       'description': 'Identifier of this set of per-data-item genomic values - name of subdirectory or Identifier of this set of per-data-item genomic values - name of the column in the matching files'
                                                       }),
                                                ('filePattern', {
                                                                 'type': 'Text',
                                                                 'required': False,
                                                                 'description': 'A glob (regular expression) containing a relative path to the file(s)'
                                                                 }),
                                                ('name', {
                                                         'type': 'Text',
                                                         'required': True,
                                                         'description': 'Display name of the property'
                                                         }),
                                                ('minVal', {
                                                           'type': 'Value',
                                                           'required': True,
                                                           'default': 0,
                                                           'description': 'Value used for lower extent of scales'
                                                           }),
                                                ('maxVal', {
                                                           'type': 'Value',
                                                           'required': True,
                                                           'description': 'Value used for upper extent of scales'
                                                           }),
                                                ('pc90Len', {
                                                           'type': 'Value',
                                                           'required': False,
                                                           'description': 'Value used for 90th percentile character-length'
                                                           }),
                                                ('blockSizeMin', {
                                                             'type': 'Value',
                                                             'required': True,
                                                             'default': 1,
                                                             'description': 'Minimum block size used by the multiresolution summariser (in bp)'
                                                             }),
                                                ('blockSizeMax', {
                                                                'type': 'Value',
                                                                'required': True,
                                                                'description': 'Maximum block size used by the multiresolution summariser (in bp)'
                                                                }),
                                                ('channelColor', {
                                                                'type': 'Text',
                                                                'required': False,
                                                                'description': 'Colour used to display these tracks as a genome browser track. Formatted as ``"rgb(r,g,b)"``'
                                                                })
                                                )
                                               )
                                                      })
                                ))


        dataTableSettings["properties"]["children"] = self._propertiesDefault
        return dataTableSettings

    def _getDocHeader(self):
        return '''.. _YAML: http://www.yaml.org/about.html

.. _def-settings-datatable:

Data table settings
-------------------

This YAML_ file contains settings for a :ref:`data table<dataconcept_datatable>`. See also:

- :ref:`data-import-settings`
- :ref:`data-import-adddatatable`
- `Example file
  <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/datatables/variants/settings>`_


Possible keys
.............
'''

    def _getDocFooter(self):
        return '''


.. toctree::
  :maxdepth: 1

  datatable_properties
  datatable_dataitemviews
'''

    def _getDocFilename(self):
        return 'documentation/importdata/importsettings/datatable.rst'

    def _getDocSettings(self):
        tableSettings = copy.deepcopy(self.getSettings())
        del tableSettings['properties']['children']
        tableSettings['dataItemViews']['children'] = {
                                                        'type': {
                                                                 'type': 'Text',
                                                                 'required': True,
                                                                 'description': '''Identifier of the custom view type
    (can be ``Overview``, ``PropertyGroup``, ``FieldList``, ``ItemMap``, ``PieChartMap``)
    See :ref:`def-settings-datatable-dataitemviews` for more details about defining custom data item views'''
                                                                }
                                                      }

        return tableSettings

    def generateDocs(self):
        ImportSettings.generateDocs(self)

        f = open('documentation/importdata/importsettings/datatable_dataitemviews.rst', 'w')
        print('''.. _def-settings-datatable-dataitemviews:

DataItemViews settings
^^^^^^^^^^^^^^^^^^^^^^
The key *Type* for member of the data table settings key *DataItemViews* can have the following values:

''', file = f)
        tableSettings= self.getSettings()['dataItemViews']['children']
        for key in tableSettings:
            detail = tableSettings[key]
            self._printProperty(key, detail, f)
        f.close()
