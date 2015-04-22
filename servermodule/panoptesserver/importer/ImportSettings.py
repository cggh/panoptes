# -*- coding: utf-8 -*-
from __future__ import print_function
import yaml
import copy
import DQXUtils
from collections import OrderedDict
import simplejson
import ImpUtils
import DQXDbTools

class ImportSettings:
    #AllowSubSampling, False
    #MaxTableSize
       
    _2DtableSettings = OrderedDict((
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
    
    _refGenomeSettings = OrderedDict((
                         ('GenomeBrowserDescr', {
                              'type': 'Text',
                              'required': False,
                              'description': 'Descriptive text that will be displayed in the genome browser section of the main page'
                              }),
                         ('AnnotMaxViewPortSize', {
                                                  'type': 'Value',
                                                  'required': False,
                                                  'description': 'Maximum viewport (in bp) the genome browser can have in order to show the genome annotation track'
                                                  }),
                         ('RefSequenceSumm', {
                                                  'type': 'Boolean',
                                                  'required': False,
                                                  'description': 'If set, a summary track displaying the reference sequence with be included in the genome browser'
                                                  }),
                         ('Annotation', {
                                        'type': 'Block',
                                        'required': False,
                                        'description': 'Directives for parsing the annotation file (annotation.gff)',
                                        'children': OrderedDict((
                                                     ('Format', {
                                                                'type': 'Text',
                                                                'description': '''File format. Possible values
        GFF = Version 3 GFF file
        GTF = Version 2 GTF file

'''
                                                                }),
                                                     ('GeneFeature', {
                                                                     'type': 'Text or List',
                                                                     'description': 'Feature id(s) used to identify genes.\n  Example: [gene, pseudogene]'
                                                                     }),
                                                     ('ExonFeature', {
                                                                     'type': 'Text or List',
                                                                     'description': 'Feature id(s) used to identify exons'
                                                                     }),
                                                     ('GeneNameAttribute', {
                                                                     'type': 'Text',
                                                                     'description': 'Attribute id used to identify gene names'
                                                                     }),
                                                     ('GeneNameSetAttribute', {
                                                                     'type': 'Text or List',
                                                                     'description': 'Attribute id(s) used to identify gene name sets.\n  Example: [Name,Alias]'
                                                                     }),
                                                     ('GeneDescriptionAttribute', {
                                                                     'type': 'Text or List',
                                                                     'description': 'Attribute id(s) used to identify gene descriptions'
                                                                     })
                                                     
                                                     ))
                                        }),
                          ('ExternalGeneLinks' , {
                                   'type': 'List',
                                   'required': False,
                                   'description': '''Each item in the list specifies a link for a gene to an external url.
  These links will show up as buttons in the gene popup window''',
                                   'children': OrderedDict((
                                                ('Url', {
                                                        'type': 'Text',
                                                        'required': True,
                                                        'description': '''Url for this link.
      This may include a token ``{Id}`` to refer to the unique gene identifier.
      Example: ``https://www.google.co.uk/search?q={Id}``'''
                                                        }),
                                                ('Name', {
                                                        'type': 'Text',
                                                        'required': True,
                                                        'description': 'Display name for this external link'
                                                        })
                                                ))
                                })
                         ))
    
    _dataTableSettings = OrderedDict((
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
                                                            'siblingRequired': { 'name': 'Type', 'value': 'ItemMap'},
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
                                                            'siblingRequired': { 'name': 'Type', 'value': 'ItemMap'},
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
                                   'settingRequired': [{ 'name': 'IsPositionOnGenome', 'value': True}, { 'name': 'IsRegionOnGenome', 'value': True}],
                                   'description': 'Specifies the table column ID that contains the chromosome\n  (only to be used if *IsPositionOnGenome* or *IsRegionOnGenome* is set).\n  Note that the values in this column should correspond to the content of the ``chromosomes`` source file\n  (see :ref:`def-source-referencegenome`)'
                                }),
                         ('Position', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'settingRequired': [{ 'name': 'IsPositionOnGenome', 'value': True} ],
                                   'description': 'Specifies the table column ID that contains the position on the chromosome\n  (only to be used if *IsPositionOnGenome* is set)'
                                }),
                         ('RegionStart', {
                                   'type': 'PropertyID',
                                   'required': False,
                                   'settingRequired': { 'name': 'IsRegionOnGenome', 'value': True},
                                   'description': 'Specifies the table column ID that contains the start position of the region\n  (only to be used if *IsRegionOnGenome* is set)'
                                }),
                         ('RegionStop', {
                                   'type': 'PropertyID',
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
                                                           'description': 'Minimum this value can reach'
                                                           }),
                                                ('MaxVal', {
                                                           'type': 'Value',
                                                           'required': True,
                                                           'description': 'Maximum this value can reach'
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
                                                                'propName': 'channelColor',
                                                                'description': 'Colour used to display these tracks as a genome browser track. Formatted as ``"rgb(r,g,b)"``'
                                                                })
                                                )
                                               )
                                                      })
                                ))
                      
    
    _propertiesDefault = OrderedDict((
                            ('Id', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Identifier of the property, equal to the corresponding column header in the TAB-delimited source file ``data``'
                                   }),
                            ('DataType', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Data type of the values in the property',
                                   'values':  OrderedDict(( ('Text', {
                                                     'description': 'text strings'
                                                     }),
                                               ('Value', {
                                                     'description': 'numerical values (integer of decimal; the distinction is made by the key *DecimDigits*).\n    Absent values can be coded by an empty string, "NA", "None", "NULL", "null", "inf" or "-"'
                                                     }),
                                               ('HighPrecisionValue', {
                                                     'description': 'same as ``Value``, with higher precision'
                                                     }),
                                               ('Boolean', {
                                                     'description': 'Yes/No binary states. Possible values according to YAML: y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF.\n    Absent values are coded by an empty string'
                                                     }),
                                               ('GeoLongitude', {
                                                     'description': 'longitude part of a geographical coordinates (in decimal degrees).\n    Absent values are coded by an empty string'
                                                     }),
                                               ('GeoLattitude', {
                                                     'description': 'latitude part of a geographical coordinates (in decimal degrees).\n    Absent values are coded by an empty string'
                                                     }),
                                               ('Date', {
                                                     'description': 'calendar dates, ISO formatted (i.e. YYYY-MM-DD).\n    Absent values are coded by an empty string'
                                                     })
                                                ))
                                          }),
                            ('Name', {
                                   'type': 'Text',
                                   'required': True,
                                   'description': 'Display name of the property'
                                   }),
                            ('Description', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'Brief description of the property.\n  This will appear in hover tool tips and in the popup box if a user clicks a property info button'
                                   }),
                            ('GroupId', {
                                   'type': 'Text',
                                   'required': False,
                                   'description': 'Id of the Property group this property belongs to'
                                   }),
                            ('ExternalUrl', {
                                             'type': 'Text',
                                             'required': False,
                                             'description': '''A url that should be opened when the user clicks on a value of this property. The url should
  be formatted as a template, with ``{value}`` interpolated to the property value.
  For example: ``http://www.ebi.ac.uk/ena/data/view/{value}``'''
                                             }),
                            ('IsCategorical', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'propName': 'isCategorical',
                                   'description': 'Instructs Panoptes to treat the property as a categorical variable.\n  For example, a combo box with the possible states is automatically shown in queries for this property.\n  Categorical properties are automatically indexed'
                                   }),
                            ('CategoryColors', {
                                   'type': 'Block',
                                   'required': False,
                                   'propName': 'categoryColors',
                                   'description': 'Specifies display colours for the categorical states of this property.\n  Each key in the block links a possible value of the property to a color (example: ``Accepted: rgb(0,192,0)``).\n  The special value ``_other_`` can be used to specify a color for all other property values that are not listed explicitly'
                                   }),
                            ('MaxColumnWidth', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'Specifies the maximum width (in pixels) used for the column representing this property in a table view.\n  Longer text will be abbreviated with ellipsis'
                                   }),
                            ('BarWidth', {
                                   'type': 'Value',
                                   'required': False,
                                   'description': 'Draws a bar in the background of the table, indicating the value.\n  Requires *MinVal* & *MaxVal* to be defined',
                                   'siblingOptional': { 'name': 'DataType', 'value': ['Value','HighPrecisionValue']}
                                   }),
                            ('MinVal', {
                                   'type': 'Value',
                                   'required': False,
                                   'propName': 'minval',
                                   'default': 0,
                                   'description': 'For *Value* types, specifies the minimum value that can be reached',
                                   'siblingOptional': { 'name': 'DataType', 'value': ['Value','HighPrecisionValue']}
                                   }),
                            ('MaxVal', {
                                   'type': 'Value',
                                   'required': False,
                                   'propName': 'maxval',
                                   'default': 1.0,
                                   'description': 'For *Value* types, specifies the maximum value that can be reached',
                                   'siblingOptional': { 'name': 'DataType', 'value': ['Value','HighPrecisionValue']}
                                   }),
                            ('MaxLen', {
                                   'type': 'Value',
                                   'required': False,
                                   'default': 0,
                                   'description': 'If present used to specify the maximum size of the database column - otherwise it is calculated'
                                   }),
                            ('DecimDigits', {
                                   'type': 'Value',
                                   'required': False,
                                   'propName': 'decimDigits',
                                   'description': 'For *Value* types, specifies the number of decimal digits used to display the value',
                                   'siblingOptional': { 'name': 'DataType', 'value': ['Value','HighPrecisionValue']}
                                   }),
                            ('Index', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': False,
                                   'description': 'If set, instructs Panoptes to create an index for this property in the relational database.\n  For large datasets, this massively speeds up queries and sort commands based on this property'
                                   }),
                            ('Search', {
                                   'type': 'Text',
                                   'required': False,
                                   'default': 'None',
                                   'description': 'Indicates that this field can be used for text search in the find data item wizard',
                                   'values':  OrderedDict((( 'None', {
                                                         'description': ''
                                                         }),
                                                ('Match', {
                                                     'description': 'only exact matched are searched for'
                                                     }),
                                                ('StartPattern', {
                                                     'description': 'searches all text that starts with the string typed by the user'
                                                     }),
                                                ('Pattern', {
                                                     'description': 'searches all text that contains the string typed by the user'
                                                     })
                                               ))
                                      }),
                            ('Relation', {
                                   'type': 'Block',
                                   'required': False,
                                   'description': 'Defines a many-to-one foreign relation to a parent data table.\n  The parent table should contain a property with the same name as the primary key property in the child table',
                                   'children': OrderedDict((( 'TableId', {
                                                             'type': 'DatatableID',
                                                             'required': True,
                                                             'description': 'Data table ID of the relation parent table'
                                                             }),
                                                ('ForwardName', {
                                                                'type': 'Text',
                                                                'required': True,
                                                                'default': 'belongs to',
                                                                'description': 'Display name of the relation from child to parent'
                                                                }),
                                                ('ReverseName', {
                                                                'type': 'Text',
                                                                'required': True,
                                                                'default': 'has',
                                                                'description': 'Display name of the relation from parent to child'
                                                                })
                                                ))
                                   }),
                          
                            ('ReadData', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'default': True,
                                   'description': 'If set to false, this property will not be imported from the TAB-delimited source file'
                                   }),
                            ('CanUpdate', {
                                   'type': 'Boolean',
                                   'default': False,
                                   'required': False,
                                   'description': ' If set to true, this property can be modified by the user. (*NOTE: under construction*)'
                                   }),
                            ('ShowInTable', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'propName': 'showInTable',
                                   'description': 'If set, this property will appear by default in data table grids in the application'
                                   }),
                            ('ShowInBrowser', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'propName': 'showInBrowser',
                                   'description': 'If set, this property will automatically appear as a track in the genome browser\n  (only applies if *IsPositionOnGenome* is specified in database settings)'
                                   }),
                            ('BrowserDefaultVisible', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'Indicates that the track will activated by default in the genome browser ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('BrowserShowOnTop', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'description': 'Indicates that the track will be shown in the top (non-scrolling) area of the genome browser.\n  In this case, it will always be visible ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('ChannelName', {
                                   'type': 'Text',
                                   'required': False,
                                   'propName': 'channelName',
                                   'description': 'Name of the genome browser track this property will be displayed in.\n   Properties sharing the same track name will be displayed in overlay\n   ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('ChannelColor', {
                                   'type': 'Text',
                                   'required': False,
                                   'propName': 'channelColor',
                                   'description': 'Colour used to display this property in the genome browser. Formatted as ``"rgb(r,g,b)"``\n  ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('ConnectLines', {
                                   'type': 'Boolean',
                                   'required': False,
                                   'propName': 'connectLines',
                                   'description': 'Indicate that the points will be connected with lines in the genome browser\n  ',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True}
                                   }),
                            ('DefaultVisible', {
                                                'type': 'Boolean',
                                                'required': False,
                                                'default': True,
                                                'description': ''
                                                }),
                            ('Order', {
                                       'type': 'Value',
                                       'required': False,
                                       'default': -1,
                                       'description': 'Only used for reference genome tracks'
                                       }),
                            ('SummaryValues', {
                                   'type': 'Block',
                                   'required': False,
                                   'description': 'Instructs Panoptes to apply a multiresolution summary algorithm for fast display of this property\n  in the genome browser at any zoom level',
                                   'siblingOptional': { 'name': 'ShowInBrowser', 'value': True},
                                   
                                   'children': OrderedDict(( 
                                                ('BlockSizeMin', {
                                                             'type': 'Value',
                                                             'required': False,
                                                             'default': 1,
                                                             'description': 'Minimum summary block size (in bp)'
                                                             }),
                                                ('BlockSizeMax', {
                                                                'type': 'Value',
                                                                'required': True,
                                                                'description': 'Maximum summary block size (in bp)'
                                                                }),
                                                ('ChannelColor', {
                                                                'type': 'Text',
                                                                'required': False,
                                                                'propName': 'channelColor',
                                                                'description': 'Colour of the channel. Formatted as ``"rgb(r,g,b)"``'
                                                                })
                                                            ))
                                               })
                          ))
                                                    
    _datasetSettings = OrderedDict((
                                    ('Name', {
                                          'type': 'Text',
                                          'required': True,
                                          'description': 'The visible name of the dataset, as it appears on the intro page'}),
                                    ('NameBanner', {
                                          'type': 'Text',
                                          'required': False,
                                          'description': 'Visible name of the dataset, as it appears on the top banner of the app.\n  Note: this text may contain html markup'}),
                                    ('Description', {
                                          'type': 'Text',
                                          'required': False,
                                          'description': '''A description of the dataset that appears on the start page.
  Note: this text may contain html markup, and documentation links (see :ref:`def-source-docs`).
  A longer description can be split over several lines by writing a ``>`` sign on the key line,
  and indent subsequent lines::

     Description: >
        This web application provides an interactive view
        on the data ..'''}),
                                    ('DataTables', {
                                          'type': 'List',
                                          'required': False,
                                          'description': '''A list of the data table identifiers in the dataset.
  These names should correspond to directory names in the *datatables* source directory (see :ref:`def-source-datatable`).
  This can be included in the settings in order to provide an explicit ordering of the data tables in the app.
  If this key is not provided, a default ordering wil be used'''}),
                                    ('2D_DataTables', {
                                                       'type': 'List',
                                                       'required': False,
                                                       'description': 'List the 2D data tables that should be exposed in the app'
                                                       }),
                                    ('IntroRightPanelFrac', {
                                          'type': 'Value',
                                          'required': False,
                                          'description': 'Controls the proportion of left and right columns on the start page. If set to zero, the right column will be absent'}),
                                    ('IntroSections', {
                                          'type': 'List',
                                          'required': False,
                                          'description': '''Enumerates sections on the intro page that can contain quick start buttons to specific views in the app.
  Buttons can be added to these sections by (1) clicking on the "Get Link" button in the top right corner of the app,
  (2) clicking on one of the "Add to start page" options, and (3) entering the right section id in the "Section" edit box.
  Similarly, a button displaying a plot can be created by clicking the link button in the plot popup''',
                                          'children': OrderedDict((
                                                                   ('Id', {
                                                                         'type': 'Text',
                                                                         'required': False,
                                                                         'description': 'Unique identifier of the section'}),
                                                                   ('Name', {
                                                                         'type': 'Text',
                                                                         'required': False,
                                                                         'description': 'Displayed title'}),
                                                                   ('Content', {
                                                                         'type': 'Text',
                                                                         'required': False,
                                                                         'description': 'Intro text of the section, appearing above the buttons. This text can be HTML formatted'}),
                                                                   ('RightPanel', {
                                                                         'type': 'Boolean',
                                                                         'required': False,
                                                                         'description': 'If set, the section will appear in the right column, replacing the default content of this column'})
                                                                   ))}),
                                    ('GoogleAnalyticsId', {
                                                            'type': 'Text',
                                                            'required': False,
                                                            'description': ''
                                                            })
                                    ))
    
    _graphSettings = OrderedDict((
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
    _workspaceSettings = { 'Name': { 'type': 'Text', 'required': True, 'description': ''}}
    
    _customDataSettings = OrderedDict((('PropertyGroups', {
                                                          'type': ''
                                                          }),
                                      ('Properties', { 
                                                      'type': ''
                                                      }),
                                      ('DataItemViews', {
                                                         'type': ''
                                                         }),
                                      ('CustomData', {
                                                      'type': 'List',
                                                      'required': False,
                                                      'description': 'Optionally, an explicit list of custom data can be specified to control the order of import'
                                                      })))
    
    def __init__(self, fileName = None, log = True, settingsDef = None):
        self._logLevel = log
        self._settingsDef = settingsDef
        self._propidMap = OrderedDict()
        self._settings = {}
        self._errors = []
        self._dataTableSettings["Properties"]["children"] = self._propertiesDefault
        self._customDataSettings["PropertyGroups"] = self._dataTableSettings["PropertyGroups"]
        self._customDataSettings["Properties"] = self._dataTableSettings["Properties"]
        self._customDataSettings["Properties"]["required"] = False
        self._customDataSettings["DataItemViews"] = copy.deepcopy(self._dataTableSettings["DataItemViews"])
        #Is a list of property Ids in the parent table but since we don't have this info
        self._customDataSettings["DataItemViews"]["children"]["Fields"]["type"] = 'List'
        
        self.loadFile(fileName)
    
    def __str__(self):
        return str(self._propidMap)
    
    def _log(self, message):
        if (self._logLevel):
            print(message)
                
    def loadFile(self, fileName):
        if fileName is not None:
            self.fileName = fileName
            if self._logLevel:
                self._log('Loading settings from: '+fileName)

            with open(self.fileName, 'r') as configfile:
                try:
                    self._settings = yaml.load(configfile.read())
                except Exception as e:
                    print('ERROR: yaml parsing error: ' + str(e))
                    raise ImportError.ImportException('Error while parsing yaml file {0}'.format(fileName))
                
            self._load()
            if self._logLevel:
                self._log('Settings: '+str(self._settings))
        else:
            self.fileName = ''
            

    #Where a file defines a single property
    def loadPropsFile(self, propName, fileName):
        if fileName is not None:
            self.fileName = fileName
            if self._logLevel:
                self._log('Loading settings from: '+fileName)
            self._settings = {}
            self._settings['Properties'] = []
            with open(self.fileName, 'r') as configfile:
                try:
                    input = yaml.load(configfile.read())
                    input['Name'] = propName
                    input['Id'] = propName
                    if 'DataType' not in input:
                        if 'IsCategorical' in input and input['IsCategorical']:
                            input['DataType'] = 'Text'
                        else:
                            input['DataType'] = 'Value'
                    #Because there's a different definition hierarchy
                    if not 'SummaryValues' in input:
                        input['SummaryValues'] = {}
                        for key in self._propertiesDefault['SummaryValues']['children']:
                            if key in input:
                                input['SummaryValues'][key] = input[key]
                                del input[key]
                    self._settings['Properties'].append(input)
                except Exception as e:
                    print('ERROR: yaml parsing error: ' + str(e))
                    raise ImportError.ImportException('Error while parsing yaml file {0}'.format(fileName))
                
            self._load()
            if self._logLevel:
                self._log('Settings: '+str(self._settings))
        else:
            self.fileName = ''
            
    def loadProps(self, props, validate = True):
 
        if props is None:
            return
        
        self._settings.update(copy.deepcopy(props))
        self._load(validate)
         
            
    def _addDefaultProperties(self):
        
        if ('PrimKey' in self._settings and (self._settings == 'AutoKey')):
            propid = 'AutoKey'
            self._propidMap[propid] = {
                                          'Id': propid,
                                          'Name': propid,
                                          'ShowInTable': True,
                                          'DataType': 'Value',
                                          'DecimDigits': 0
                                          }
        
    def _setDefaultValues(self):

        for key in self._propidMap:
            values = self._propidMap[key]
            if 'IsCategorical' in values and values['IsCategorical']:
                self._propidMap[key]['Index'] = True
            if 'Relation' in values and values['Relation']:
                self._propidMap[key]['Index'] = True
            if 'Search' in values and values['Search'] in ['StartPattern', 'Pattern', 'Match']:
                self._propidMap[key]['Index'] = True # Use index to speed up search
        
        if 'SortDefault' in self._settings:
            sd = self._settings['SortDefault']
            if sd in self._propidMap:
                self._propidMap[sd]['Index'] = True    


    def _checkSiblingRequired(self, testDict, pkey, srdef, siblings):

        siblingValue = srdef['value']
        siblingName = srdef['name']
       
        
        if testDict[siblingName] != siblingValue:
            if pkey in testDict:
                self._errors.append("{} Wrong value for {} (expected {} got {}) for {}".format(pkey, siblingName, siblingValue, testDict[siblingName], str(testDict)))
        else:
            if testDict[siblingName] == siblingValue and not pkey in testDict:
                self._errors.append("Missing required value {} for {} because {} == {}".format(pkey, str(testDict), siblingName, siblingValue))
                    
    def _checkSettingRequired(self, testDict, pkey, srdef):
        settingValue = srdef['value']
        settingName = srdef['name']
        
        if (settingName in self._settings and self[settingName] == settingValue):
            if not pkey in testDict:
                self._errors.append("Missing required value {} for {}".format(pkey, str(testDict)))
        
    def _checkProperty(self, testDict, pkey, pdef, siblings = None):
        
        #print("Checking {} {}".format(str(testDict), str(pdef)))        
        if pdef['type'] == 'documentation':
            return
        
        #print "Checking property {} {} {}".format(str(testDict), pkey, pdef)
        if 'required' in pdef and pdef['required']:
            if not pkey in testDict:
                #This is so common it's fudged...
                if pkey == 'Name' and 'Id' in testDict:
                    testDict['Name'] = testDict['Id']
                else:
                    self._errors.append("Missing required value {} for {}".format(pkey, str(testDict)))
                #print "Missing failed - Checking {} for {} using {}".format(str(testDict),pkey,str(pdef))
                
                   
        if 'children' in pdef and pkey in testDict:
            pcvalues = pdef['children']
            for pckey in pcvalues:
                if type(testDict[pkey]) == list:
                    for val in testDict[pkey]:
                        self._checkProperty(val, pckey, pcvalues[pckey], testDict[pkey])
                else:
                    self._checkProperty(testDict[pkey], pckey, pcvalues[pckey])

        if pkey in testDict:
            value = testDict[pkey]
            
            #Check enumerated values
            if 'values' in pdef:
                if value not in pdef['values']:
                    self._errors.append("Invalid value {} for key {}".format(value, pkey))
        
        #Make sure Booleans are bool
            if pdef['type'] == 'Boolean':
                if not type(value) is bool:
                    self._errors.append("{} must be a boolean is {}".format(pkey,value))
            elif pdef['type'] == 'Block':
                if not type(value) is dict:
                    self._errors.append("{} must be a block is {}".format(pkey, value))
            elif pdef['type'] == 'List':
                if not type(value) is list:
                    self._errors.append("{} must be a List is {}".format(pkey, value))
            elif pdef['type'] == 'Value':
                if not (type(value) is int or type(value) is float):
                    self._errors.append("{} must be a Value is {}".format(pkey, value))
            elif pdef['type'] == 'Text' or pdef['type'] == 'DatatableID':
                if not type(value) is str:
                    self._errors.append("{} must be a str is {}".format(pkey, value))
            elif pdef['type'] == 'Text or List':
                if not (type(value) is str or type(value) is list):
                    self._errors.append("{} must be Text or List is {}".format(pkey, value))
            elif pdef['type'] == 'PropertyID':
                if not (value in self._propidMap or (pkey == 'PrimKey' and value == 'AutoKey') or value == 'None' or ('AutoScanProperties' in self._settings and self._settings["AutoScanProperties"])):
                    self._errors.append("{} must be a valid PropertyId is {}".format(pkey, value))
            elif pdef['type'] == 'PropertyIDs':
                for propid in value.split(','):
                    propid = propid.strip()
                    if not propid in self._propidMap:
                        self._errors.append("{} must be a valid PropertyId is {}".format(pkey, propid))
            elif pdef['type'] == 'PropertyIDList':
                if not type(value) is list:
                    self._errors.append("{} must be a List is {}".format(pkey, value))
                for propid in value:
                    if not propid in self._propidMap:
                        self._errors.append("{} must be a valid PropertyId is {}".format(pkey, propid))
            else:
                #Error in definition above
                self._errors.append("Undefined type {} for {}".format(pdef['type'], pkey))

        if 'siblingOptional' in pdef:
            if siblings and pkey in testDict:
                sibName = pdef['siblingOptional']['name']
                sibValue = pdef['siblingOptional']['value']
                for valkey in testDict:
                    val = testDict[valkey]
                    if valkey == sibName:
                        if type(sibValue) == str and val != sibValue:
                            self._errors.append("Wrong sibling value for {} ({})\n (expected {} {}, got {} {}) for {}".format(sibName, pkey, sibValue, type(sibValue), val, type(val), str(testDict)))
                        if type(sibValue) == list and val not in sibValue:
                            self._errors.append("Wrong sibling value for {} ({})\n (expected {} {}, got {} {}) for {}".format(sibName, pkey, sibValue, type(sibValue), val, type(val), str(testDict)))
                
        if 'siblingRequired' in pdef:
            if type(pdef['siblingRequired']) == list:
                for srdef in pdef['siblingRequired']: 
                    self._checkSiblingRequired(testDict, pkey, srdef, siblings)
            else:
                self._checkSiblingRequired(testDict, pkey, pdef['siblingRequired'], siblings)
            
        if 'settingRequired' in pdef:
            if type(pdef['settingRequired']) == list:
                for srdef in pdef['settingRequired']: 
                    self._checkSettingRequired(testDict, pkey, srdef)
            else:
                self._checkSettingRequired(testDict, pkey, pdef['settingRequired'])
               
    def _validate(self, toValidate, definition):

        if type(toValidate) == list:
            for item in toValidate:
                self._validate(item, definition)
        elif type(toValidate) == dict:
            for key in toValidate:
                                
                value = toValidate[key]

                if key not in definition:
                    self._errors.append("Unknown property key {} in {}".format(key, str(toValidate)))
                    continue
                
                defn = definition[key]
                
                if 'children' in defn:
                    self._validate(value, defn["children"])
                elif key in definition:
                    if type(value) == dict:
                        self._checkProperty(value, key, defn)
                else:
                    self._errors.append("Unknown configuration item: {}".format(key))
                     
        if type(definition) == list:
            for item in definition:
                self._validate(toValidate, item)
        elif type(definition) == dict or isinstance(definition,OrderedDict):
            for key in definition:
                value = definition[key]
                #print "Checking defns {} {} {}".format(str(toValidate), key, value)
                if type(toValidate) == list:
                    for item in toValidate:
                        self._checkProperty(item, key, value)
                else:
                    self._checkProperty(toValidate, key, value)
        else:
            print ("definition not a list or dict" + str(type(definition)))           
                

    def _mergeProperties(self):
        if 'Properties' in self._settings:
            if not type(self._settings['Properties']) is list:
                raise Exception('Properties token should be a list')
            for propSource in self._settings['Properties']:
                if 'Id' not in propSource:
                    raise Exception('Property is missing Id field')
                propids = propSource['Id']
                if not (isinstance(propids, basestring)):
                    raise Exception('Property has invalid Id field: ' + str(propids)) #Merge sections with the same Id
                for propid in propids.split(','):
                    propid = propid.strip()
                    try:
                        if not propid in self._propidMap:
                            properties = {'propid':propid}
                            self._propidMap[propid] = properties
                        self._propidMap[propid].update(copy.deepcopy(propSource))
                        #Really using 'propid' instead of 'Id' but to be tidy
                        self._propidMap[propid]['Id'] = propid
                    except Exception as e:
                        raise Exception('Invalid property "{0}": {1}'.format(propid, str(e)))
            
            #Now we need to update the original so it can be validated
            propsList = copy.deepcopy(self._settings["Properties"])
                        #Do it backwards so can deleted without changing the index
            for i, propDetails in reversed(list(enumerate(propsList))):
                propid = propDetails['Id']
                if propid in self._propidMap:
                    self._settings['Properties'][i] = copy.deepcopy(self._propidMap[propid])
                    del self._settings['Properties'][i]['propid']
                else:
                    del self._settings['Properties'][i]

    #Set any implied values here
    def _postProcess(self):
        
        for propid in self.getPropertyNames():
            cc = self.getPropertyValue(propid, 'CategoryColors')
            if cc:
                categories = [x for x in cc]
                self._propidMap[propid]['Categories'] = categories
                print ("Set Categories for {}".format(propid))

    def _load(self, validate = True):
        
        self._addDefaultProperties()
        
        self._mergeProperties()
                   
        self._setDefaultValues()
        
        if self._settingsDef is None:
            if 'NameSingle' in self._settings:
                self._settingsDef = self._dataTableSettings
            elif 'ColumnDataTable' in self._settings:
                self._settingsDef = self._2DtableSettings
            elif 'GenomeBrowserDescr' in self._settings:
                self._settingsDef = self._refGenomeSettings
            elif 'DataTables' in self._settings:
                self._settingsDef = self._datasetSettings
            else:
                self._settingsDef = {}
                self._settingsDef["Properties"] = self._dataTableSettings["Properties"]
            
        if validate:   
            self._validate(self._settings, self._settingsDef)
        
        self._postProcess()
        
        if len(self._errors) > 0:
            raise ValueError( ";".join(self._errors))

    #Not at all sure about this...
    def ConvertStringsToSafeSQL(self, settings):

        for key in settings:
            val = settings[key]
            if type(val) is str:
                settings[key] = val.replace('"', '`').replace("'", '`')
        return settings

    #For insertion into tablecatalog, graphs
    def serialize(self):
        
        saved = copy.deepcopy(self._settings)
        for val in ['PrimKey', 'Properties']:
            if val in saved:
                del saved[val]
        
        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))
    
    def deserialize(self, settings):
        
        parsed = simplejson.loads(settings, strict=False)
        #Have to not validate as stuff has been deleted when serializing
        #Can't just remove from _settingsDef and Properties are missing     
        self.loadProps(parsed, False)           
    
    def getPropertyNames(self):
        return self._propidMap.keys()
       
    #For insertion into propertycatalog              
    def serializeProperty(self, key):
        saved = copy.deepcopy(self.getProperty(key))
        for val in ['Name', 'DataType', 'Order','SummaryValues']:
            if val in saved:
                del saved[val]
        
        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))
        
    #For insertion into propertycatalog              
    def serializePropertySummary(self, key):
        saved = copy.deepcopy(self.getProperty(key))
        if 'Name' in saved:
            del saved['Name']
        del saved['DataType']
        if 'Order' in saved:
            del saved['Order']
        
        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))

    
    def serializePropertyValue(self, key, subkey):
        saved = copy.deepcopy(self.getProperty(key)[subkey])
        
        for val in ['MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax', 'Order', 'Name']:
            if val in saved:
                del saved[val]
                
        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))

    def serializeSummaryValues(self, key):
        props = self.getProperty(key)
        saved = copy.deepcopy(props['SummaryValues'])
        
        for val in props['SummaryValues']:
            defn = self._propertiesDefault['SummaryValues']['children']
            if val in defn and 'propName' in defn[val]:
                name =  defn[val]['propName']
                saved[name] = saved[val]
                del saved[val] 

        
        for val in ['CategoryColors', 'DefaultVisible', 'IsCategorical', 'Categories', 'ChannelColor']:
            if val in props:
                if val in self._propertiesDefault and 'propName' in self._propertiesDefault[val]:
                    name =  self._propertiesDefault[val]['propName']
                else:
                    name = val
                saved[name] = props[val]
                
        for val in ['MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax', 'Order', 'Name']:
            if val in saved:                
                del saved[val]
                
        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))

    #For insertion into tablebasedsummaryvalues
    def serializeTableBasedValue(self, key):
        
        saved = copy.deepcopy(self.getTableBasedSummaryValue(key))
                
        for val in self.getTableBasedSummaryValue(key):
            defn = self._dataTableSettings['TableBasedSummaryValues']['children']
            if val in defn and 'propName' in defn[val]:
                name =  defn[val]['propName']
                saved[name] = saved[val]
                del saved[val] 
                
        for val in ['Id', 'Name', 'MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax']:
            if val in saved:
                del saved[val]
                
        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))
    
    def serializeCustomData(self):
        
        saved = copy.deepcopy(self._settings)
        
        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))
    
    def serialize2DdataTable(self):
        saved = copy.deepcopy(self._settings)

        for val in ['ColumnDataTable',
                                      'ColumnIndexField',
                                      'RowDataTable',
                                      'RowIndexField',
                                      'Properties']:
            if val in saved:
                del saved[val]
            
        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))
    
    def serializePropertyValues(self, propid):
        saved = copy.deepcopy(self.getProperty(propid))

        for val in [ 'Id', 'Name', 'propid']:
            if val in saved:
                del saved[val]
            
        return simplejson.dumps(self.ConvertStringsToSafeSQL(saved))
            
    def saveGlobalSettings(self, calculationObject, datasetId):
        calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, 'settings'))
        for token in self._settings.keys():
            st = self._settings[token]
    
            if token == 'IntroSections':
                for sect in st:
                    if 'Content' in sect:
                        sect['Content'] = sect['Content'].replace('\r', '\\r').replace('\n', '\\n').replace('"', '\\"')
    
            if (type(st) is list) or (type(st) is dict):
                st = simplejson.dumps(st)
            ImpUtils.ExecuteSQL(calculationObject, datasetId, "INSERT INTO settings VALUES ('{0}', '{1}')".format(
                token,
                st
                ))

    def __getitem__(self, key):
        
        settings = self._settings
        
        #So default is used
        if settings is None:
            settings = {}
            
        if key in self._settingsDef and 'default' in self._settingsDef[key]:
            return settings.get(key, self._settingsDef[key]['default'])
        else:
            if key in settings:
                return (settings[key])
            else:
                return None
 
    def __setitem__(self, key, value):
        if key in self._settingsDef:
            self._settings[key] = value
        else:
            self._settings[key] = value
            #Only a warning as sometimes (e.g. 'hasGenomeBrowser') a value can be set in the code that can't be in the settings
            self._log("Attempting to set an undefined key:" + key)
           
    def getProperty(self, propid):
        if propid in self._propidMap:
            return self._propidMap[propid]
        else:
            return None
            
    def getPropertyValue(self, propid, key):
        
        prop = self.getProperty(propid)
        if key == 'Name':
            if key not in prop:
                key = 'Id'
                
        if key in self._settingsDef["Properties"]["children"] and 'default' in self._settingsDef["Properties"]["children"][key]:
            return prop.get(key, self._settingsDef["Properties"]["children"][key]['default'])
        else:
            if key in prop:
                return (prop[key])
            else:
                return None
    
    def setPropertyValue(self, propid, key, value):
        self._propidMap[propid][key] = value
        
    def getTableBasedSummaryValue(self, key):
        for defn in self._settings['TableBasedSummaryValues']:
            if defn['Id'] == key:
                return defn
        return None
    
    def _printProperty(self, key, detail, f, indent = ''):
        
        if detail['type'] == 'documentation':
            print (detail['description'], file = f)
            return
        
        print(indent + key, file = f)
        line = indent + "  *" + detail['type']
        if 'required' in detail and detail['required']:
            line = line + " (required)"
        if 'siblingRequired' in detail:
            line = line + " (required)"
        if not 'description' in detail:
            print ("Missing description for {}".format(key))
        line = line + ".* "
        if 'default' in detail:
            line = line + " Default:" + str (detail['default']) + ".  "
        line = line + detail['description'] 
        if 'siblingOptional' in detail:
            line = line + "(only applies if *" + detail['siblingOptional']['name'] + "* is " + str(detail['siblingOptional']['value']) + ")"
        if 'siblingRequired' in detail:
            line = line + "(only applies if *" + detail['siblingRequired']['name'] + "* is " + str(detail['siblingRequired']['value']) + ")"
        print(line + ".", file = f)
        if 'values' in detail:
            print(indent + "  Possible values:", file = f)
            print('', file = f)
            for val in detail['values']:
                if not 'description' in detail['values'][val]:
                    print ("Missing description for {}".format(val))
                print(indent + "  - ``" + val + "``: " + detail['values'][val]['description'] + ".", file = f)
        if 'children' in detail:
            print(indent + "  The block can contain the following keys:", file = f)
            for val in detail['children']:
                self._printProperty(val, detail['children'][val], f, '    ')
        print('', file = f)        
        
    def generateDocs(self):
        
        f = open('documentation/importdata/importsettings/dataset.rst', 'w')
        print('''.. _YAML: http://www.yaml.org/about.html


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
''', file = f)
        for key in self._datasetSettings:
            detail = self._datasetSettings[key]
            self._printProperty(key, detail, f)

        f.close()
        
        f = open('documentation/importdata/importsettings/datatable_properties.rst', 'w')
        print('''.. _def-settings-datatable-properties:

Datatable property settings
^^^^^^^^^^^^^^^^^^^^^^^^^^^
An overview of the possible keys than can be defined for an individual property in
the *Properties* block of the data table settings.
''', file = f)
        for key in self._propertiesDefault:
            detail = self._propertiesDefault[key]
            self._printProperty(key, detail, f)
        f.close()
        
        f = open('documentation/importdata/importsettings/datatable.rst', 'w')
        print('''.. _YAML: http://www.yaml.org/about.html

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
''', file = f)
        tableSettings = copy.deepcopy(self._dataTableSettings)
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
        for key in tableSettings:
            detail = tableSettings[key]
            self._printProperty(key, detail, f)
        
        print ('''


.. toctree::
  :maxdepth: 1

  datatable_properties
  datatable_dataitemviews
''', file = f)
        f.close()   
        
        f = open('documentation/importdata/importsettings/datatable_dataitemviews.rst', 'w')
        print('''.. _def-settings-datatable-dataitemviews:

DataItemViews settings
^^^^^^^^^^^^^^^^^^^^^^
The key *Type* for member of the data table settings key *DataItemViews* can have the following values:

''', file = f)
        tableSettings= self._dataTableSettings['DataItemViews']['children']
        for key in tableSettings:
            detail = tableSettings[key]
            self._printProperty(key, detail, f)
        f.close()
        
        f = open('documentation/importdata/importsettings/refgenome.rst', 'w')
        print ('''.. _YAML: http://www.yaml.org/about.html

.. _def-settings-refgenome:

Reference genome settings
~~~~~~~~~~~~~~~~~~~~~~~~~
This YAML_ file contains settings for the :ref:`reference genome<dataconcept_refgenome>`. See also:

- :ref:`data-import-settings`
- :ref:`data-import-addannotation`
- :ref:`data-import-addrefgenome`
- `Example file
  <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/refgenome/settings>`_

Possible keys
.............

''', file = f)
        
        for key in self._refGenomeSettings:
            detail = self._refGenomeSettings[key]
            self._printProperty(key, detail, f)
            
        f.close()
        
        
        f = open('documentation/importdata/importsettings/twoddatatable.rst', 'w')
        print ('''.. _YAML: http://www.yaml.org/about.html

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
''', file = f)
        for key in self._2DtableSettings:
            detail = self._2DtableSettings[key]
            self._printProperty(key, detail, f)

        f.close()
if __name__ == '__main__':
    
    settings = ImportSettings()
    
    settings.generateDocs()
            