# -*- coding: utf-8 -*-
from __future__ import print_function
from ImportSettings import ImportSettings
from collections import OrderedDict
import copy

class SettingsDataTable(ImportSettings):
    
    def getSettings(self):
        dataTableSettings = OrderedDict((
                         ('NameSingle', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Display name referring to a single table item (single, without starting capital)'
                                }),
                         ('NamePlural', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Display name referring to several table items (plural, without starting capital)'
                                }),
                         ('Description', {
                                   'type': 'Text',
                                   'required': False,
                                   'default': '',
                                   'description': 'A short description of this data table.\n  This text will appear on the intro page, and on the table view page of this data table.\n  Note: this text may contain documentation links (see :ref:`def-source-docs`)'
                                }),
                         ('Icon', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'Specifies an icon that will be associated with the data table.\n  The icon name can be chosen from the list specified in http://fortawesome.github.io/Font-Awesome/icons/'
                                }),
                         ('IsHidden', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'If set to true, the data table will not be displayed as a standalone entity\n  (i.e. not mentioned on the intro page and no tab)'
                                }),
                         ('PrimKey', {
                                   'type': 'PropertyID',
                                   'required': True,
                                   'description': "The primary key *property ID* for this table.\n  A data item *property* is a column in the TAB-delimited source file ``data``, and the *ID* corresponds to the column header.\n  The primary key should refer to a column containing a unique value for each record in the table.\n  Optionally, this parameter can be set to '``AutoKey``' to instruct the software to automatically generate a primary key"
                                }),
                         ('ItemTitle', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'A  `handlebars <http://handlebarsjs.com/>`_ template. Defaults to the primary key.\n  The rendered template will be used when a data item title is needed'
                                }),
                         ('SortDefault', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'description': 'Specifies the property ID (i.e. column name in the ``data`` source file) used as the default sort field.'
                                }),
                         ('CacheWorkspaceData', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'If set, a materialised table will be created in the relational database for this data in each workspace.\n  For large data tables (>1M records), this option is faster than the standard option, which uses a JOIN statement'
                                }),
                         ('MaxCountQueryRecords', {
                                   'type': 'Value',
                                   'required': False,
                                   'default': 200000,
                                   'description': 'Defines the maximum number of records that will be downloaded to the client.\n  This limit influences views that display individual data items, such as scatter plots and geographical map views.\n  If not specified, this defaults to 200,000'
                                }),
                         ('MaxCountQueryAggregated', {
                                   'type': 'Value',
                                   'required': False,
                                   'default': 1000000,
                                   'description': 'Defines the maximum number of records that will be queried on the server for views that present\n  data items in an aggregated way, such as histograms and bar graphs.\n  If not specified, this defaults to 1,000,000'
                                }),
                         ('FetchRecordCount', {
                                              'type': 'Boolean',
                                              'required': False,
                                              'default': False,
                                              'description': ''
                                               }),
                         ('QuickFindFields', {
                                   'type': 'PropertyIDs',
                                   'required': False,
                                   'description': 'The list of properties will be used by some tools in the software that allow the user to quickly find a (set of) item(s)'
                                }),
                         ('ColumnIndexField', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'When this table is linked to a 2D data table setting this value to the same as that in the 2D settings provides a performance improvement for large data sets'
                                }),                                         
                         ('DisableSubsets', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'If set, there will be no subsets options for this data table'
                                }),
                         ('DisablePlots', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'If set, there will be no options to create plots for this data table'
                                }),
                         ('DisableNotes', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'If set, it will not be possible to define notes for items in this data table'
                                }),
                         ('PropertyGroups', {
                                   'type': 'List',
                                   'required': False,
                                   'default': [],
                                   'description': 'Each item in the list specifies a group of properties.\n  Property groups are used to combine sets of related properties into logical sections in the app',
                                   'children': { 'Id': {
                                                             'type': 'Text',
                                                             'required': True,
                                                             'description': 'a unique identifier for the group'
                                                             },
                                                'Name': {
                                                                'type': 'Text',
                                                                'required': True,
                                                                'description': 'a display name'
                                                                }
                                                }
                                }),
                         ('AutoScanProperties', {
                                   'type': 'documentation',
                                   'description': 'AutoScanProperties - deprecated - please use scripts/mksettings.sh to generate a skeleton settings.gen file and use that to create a settings file'
                                }),
                         ('DocProps', {
                                       'type': 'documentation',
                                       'description': '.. _Properties:'
                                       }),
                         ('Properties', {
                                   'type': 'List',
                                   'required': True,
                                   'description': 'Each list item defines a :ref:`property<dataconcept_property>`, linked to a column in the TAB-delimited source file ``data``.\n  See :ref:`def-settings-datatable-properties` settings for an overview of the keys that can be used for each property in this list',
                                   'children': {} #Is self._propertiesDefault - set in constructor
                                }),
                         ('DataItemViews', {
                                   'type': 'List',
                                   'required': False,
                                   'description': 'Definitions of custom views that will appear in the popup for an individual data table item',
                                   'children': OrderedDict(( 
                                                            ('Type', {
                                                             'type': 'Text',
                                                             'required': True,
                                                             'description': 'Identifier of the custom view type (can be Overview, PropertyGroup, FieldList, ItemMap, PieChartMap) See DataItemViews settings for more details about defining custom data item views',
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
                                                                                 'description': 'Displays the data item as a pin on a geographical map. Requires the presence of properties with data type GeoLongitude and GeoLattitude'
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
                                                            
                                                ('Name', {
                                                         'type': 'Text',
                                                         'required': True,
                                                         'description': 'Display name of this view'
                                                         }),
                                                ('Docs1', { 'type': 'documentation',
                                                                'description': '''Template
::::::::
A view that is defined by a template that is filled with row item properties'''
                                                                }),
                                                ('Content', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'Template'},
                                                            'description': 'A `handlebars <http://handlebarsjs.com/>`_ template'
                                                            }),
                                                ('Docs2', { 'type': 'documentation',
                                                                'description': '''PropertyGroup
:::::::::::::
Displays all properties that are member of a specific property group''' }),
                                                ('GroupId', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'PropertyGroup'},
                                                            'description': 'Identifier of the property group to display'
                                                            }),
                                                ('Docs3', { 'type': 'documentation',
                                                                'description': '''FieldList
:::::::::
Displays a selection of properties for the data item'''
                                                                }),
                                                ('Introduction', {
                                                         'type': 'Text',
                                                         'siblingOptional': { 'name': 'Type', 'value': 'FieldList'},
                                                         'description': 'A static text that will be displayed on top of this view'
                                                         }),
                                                ('Fields', {
                                                           'type': 'PropertyIDList',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'FieldList'},
                                                           'description': 'Each item in this list specifies a property ID'
                                                           }),
                                                ('Docs4', { 'type': 'documentation',
                                                                'description': '''ItemMap
:::::::
Displays the data item as a pin on a geographical map.
Requires the presence of properties with data type ``GeoLongitude`` and ``GeoLattitude``'''
                                                                }),
                                                ('MapZoom', {
                                                            'type': 'Value',
                                                            'siblingRequired': [{ 'name': 'Type', 'value': 'ItemMap'},{ 'name': 'Type', 'value': 'PieChartMap'}],
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
                                                ('PieChartSize', {
                                                            'type': 'Value',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'PieChartMap'},
                                                            'description': 'Displayed size of the largest pie chart'
                                                            }),
                                                ('MapCenter', {
                                                            'type': 'Block',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'PieChartMap'},
                                                            'description': 'Specifies the map center in the start view',
                                                            'children': OrderedDict((
                                                                         ('Longitude', {
                                                                                       'type': 'Value',
                                                                                       'required': True,
                                                                                       'description': 'Geographic longitude'
                                                                                       }),
                                                                         ('Lattitude', {
                                                                                       'type': 'Value',
                                                                                       'required': True,
                                                                                       'description': 'Geographic latitude'
                                                                                       })))
                                                            }),
                                                ('MapZoom', {
                                                            'type': 'Value',
                                                            'siblingRequired': [{ 'name': 'Type', 'value': 'ItemMap'},{ 'name': 'Type', 'value': 'PieChartMap'}],
                                                            'description': 'Start zoom factor of the map (integer, minimum value of 0)'
                                                            }),
                                                ('DataType', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'PieChartMap'},
                                                            'description': 'Type of values used to create the pie chart',
                                                            'values': {
                                                                       'Fraction': {
                                                                                    'type': 'Value',
                                                                                    'description': ''
                                                                                    }
                                                                       }
                                                            }),
                                                ('PositionOffsetFraction', {
                                                            'type': 'Value',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'PieChartMap'},
                                                            'description': 'An offset between the pie chart location and the actual chart,\n  used to achieve a nice (ideally non-overlapping) view'
                                                            }),
                                                ('LocationDataTable', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'PieChartMap'},
                                                            'description': 'ID of the data table containing the locations\n  (this table should have properties with ``GeoLongitude`` and ``GeoLattitude`` data types)'
                                                            }),
                                                ('LocationSizeProperty', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'PieChartMap'},
                                                            'description': 'Property ID of the locations data table containing the size of the pie chart'
                                                            }),
                                                ('LocationNameProperty', {
                                                            'type': 'Text',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'PieChartMap'},
                                                            'description': 'Property ID of the locations data table containing the name of the pie chart'
                                                            }),
                                                ('ComponentColumns', {
                                                            'type': 'List',
                                                            'siblingRequired': { 'name': 'Type', 'value': 'PieChartMap'},
                                                            'description': 'Enumerates all the pies displayed on the pie charts, and binds them to properties of this data table\n  (one for each combination of component x location)',
                                                            'children': OrderedDict((
                                                                         ('Pattern', {
                                                                                     'type': 'Text',
                                                                                     'required': True,
                                                                                     'description': 'Property ID of the column providing the data.\n      NOTE: the token {locid} will be replaced by the primary key value of the records in the locations data table'
                                                                                     }),
                                                                         ('Name', {
                                                                                     'type': 'Text',
                                                                                     'required': True,
                                                                                     'description': 'Display name of the pie'
                                                                                  }),
                                                                         ('Color', {
                                                                                     'type': 'Text',
                                                                                     'required': True,
                                                                                     'description': 'Color of the pie. Format: ``rgb(r,g,b)``'
                                                                                   })))
                                                            }),
                                                ('ResidualFractionName', {
                                                            'type': 'Text',
                                                            'siblingOptional': { 'name': 'Type', 'value': 'PieChartMap'},
                                                            'description': 'Name of the pie representing residual fraction (only applicable if the fractions do not sum up to 1)'
                                                            })
                                                ))
                                }),
                         ('ExternalLinks', {
                                   'type': 'List',
                                   'required': False,
                                   'description': 'Each item in the list specifies a link for a data item to an external url.\n  These links show up in the app as buttons in the data item popup window',
                                   'children': OrderedDict((
                                                ('Url', {
                                                        'type': 'Text',
                                                        'required': True,
                                                        'description': '''Url for this link. This may include tokens property ID's between curly braces.
       These tokens will be expanded to their actual content for a specific data item.
       Example: ``http://maps.google.com/maps?q={Lattitude},{Longitude}``'''
                                                        }),
                                                ('Name', {
                                                        'type': 'Text',
                                                        'required': True,
                                                        'description': 'Display name for this external link'
                                                        })
                                                ))
                                }),
                         ('ListView', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': 'Replaces the normal table view with a list view, showing rows on left and a single selected row on the right'
                                }),
                         ('IsPositionOnGenome', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': 'Instructs Panoptes that records in this data table should be interpreted as genomic positions.\n  In this case, the *Chromosome* and *Position* keys should be defined'
                                }),
                         ('IsRegionOnGenome', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': 'Instructs Panoptes that records in this datatable should be interpreted as genomic regions.\n  In this case, the *Chromosome*, *RegionStart* and *RegionStop* keys should be defined'
                                }),
                         ('BrowserTrackHeightFactor', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'Specifies a relative size factor for the genome browser track height (only applicable if *IsPositionOnGenome* or *IsRegionOnGenome* is set)'
                                }),
                         ('Chromosome', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'default': 'chrom',
                                   'settingRequired': [{ 'name': 'IsPositionOnGenome', 'value': True}, { 'name': 'IsRegionOnGenome', 'value': True}],
                                   'description': 'Specifies the table column ID that contains the chromosome\n  (only to be used if *IsPositionOnGenome* or *IsRegionOnGenome* is set).\n  Note that the values in this column should correspond to the content of the ``chromosomes`` source file\n  (see :ref:`def-source-referencegenome`)'
                                }),
                         ('Position', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'default': 'pos',
                                   'settingRequired': [{ 'name': 'IsPositionOnGenome', 'value': True} ],
                                   'description': 'Specifies the table column ID that contains the position on the chromosome\n  (only to be used if *IsPositionOnGenome* is set)'
                                }),
                         ('RegionStart', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'default': 'start',
                                   'settingRequired': { 'name': 'IsRegionOnGenome', 'value': True},
                                   'description': 'Specifies the table column ID that contains the start position of the region\n  (only to be used if *IsRegionOnGenome* is set)'
                                }),
                         ('RegionStop', {
                                   'type': 'PropertyID',
                                   'default': 'stop',
                                   'required': False,
                                   'settingRequired': { 'name': 'IsRegionOnGenome', 'value': True},
                                   'description': 'Specifies the table column ID that contains the end position of the region\n  (only to be used if *IsRegionOnGenome* is set)'
                                }),
                         ('GenomeMaxViewportSizeX', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'Specifies the maximum genome browser viewport size (in bp)\n  for which individual data points from this table will be displayed in the tracks.\n  (only to be used if *IsPositionOnGenome* or *IsRegionOnGenome* is set)'
                                }),
                         ('BrowserDefaultVisible', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'For genomic regions: specifies the default visibility status of this data table in the genome browser\n  (only to be used if *IsRegionOnGenome* is set).\n  Note that, for genomic position, default visibility is specified on a per-property basis'
                                }),
                         ('AllowSubSampling', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': ''
                                }),
                         ('MaxTableSize', {
                                   'type': 'Value',
                                   'required': False,
                                   'default': None,
                                   'description': ''
                                }),
                         ('BrowserDefaultLabel', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'description': 'Specifies the default label that is used in the genome browser, used for genomic regions.\n  None indicates that no label is displayed by default'
                                }),
                         ('TableBasedSummaryValues', {
                                   'type': 'List',
                                   'required': False,
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
                                                ('Id', {
                                                       'type': 'Text',
                                                       'required': True,
                                                       'description': 'Identifier of this set of per-data-item genomic values - name of subdirectory or Identifier of this set of per-data-item genomic values - name of the column in the matching files'
                                                       }),
                                                ('FilePattern', {
                                                                 'type': 'Text',
                                                                 'required': False,
                                                                 'description': 'A glob (regular expression) containing a relative path to the file(s)'
                                                                 }),
                                                ('Name', {
                                                         'type': 'Text',
                                                         'required': True,
                                                         'description': 'Display name of the property'
                                                         }),
                                                ('MinVal', {
                                                           'type': 'Value',
                                                           'required': True,
                                                           'default': 0,
                                                           'description': 'Value used for lower extent of scales'
                                                           }),
                                                ('MaxVal', {
                                                           'type': 'Value',
                                                           'required': True,
                                                           'description': 'Value used for upper extent of scales'
                                                           }),
                                                ('BlockSizeMin', {
                                                             'type': 'Value',
                                                             'required': True,
                                                             'default': 1,
                                                             'description': 'Minimum block size used by the multiresolution summariser (in bp)'
                                                             }),
                                                ('BlockSizeMax', {
                                                                'type': 'Value',
                                                                'required': True,
                                                                'description': 'Maximum block size used by the multiresolution summariser (in bp)'
                                                                }),
                                                ('ChannelColor', {
                                                                'type': 'Text',
                                                                'required': False,
                                                                'description': 'Colour used to display these tracks as a genome browser track. Formatted as ``"rgb(r,g,b)"``'
                                                                })
                                                )
                                               )
                                                      })
                                ))

  
        dataTableSettings["Properties"]["children"] = self._propertiesDefault
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
        del tableSettings['Properties']['children']
        tableSettings['DataItemViews']['children'] = {
                                                        'Type': {
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
        tableSettings= self.getSettings()['DataItemViews']['children']
        for key in tableSettings:
            detail = tableSettings[key]
            self._printProperty(key, detail, f)
        f.close()
        
        #For insertion into tablebasedsummaryvalues
    def serializeTableBasedValue(self, key):
        return self._prepareSerialization(self.getTableBasedSummaryValue(key), self.getSettings()['TableBasedSummaryValues']['children'])
   
        
        
        
