.. _YAML: http://www.yaml.org/about.html

Data import settings
====================

General dataset settings
------------------------
See also :ref:`def-source-datasets`. This YAML_ file can contain the following tokens:

Name
  *Text (required).* The visible name of the dataset, as it appears in the intro page.

NameBanner
  *Text.* Visible name of the dataset, as it appears in the top banner of the app.

Description
  *Text.* A description of the dataset that will appear on the start page.

DataTables
  *List.* A list of the data table identifiers in the dataset.
  These names should correspond to directory names in the datatables source directory.
  This can be included in the settings to provide an explicit ordering of the data tables.
  If this tag is not provided, a default ordering wil be used.

Datatable settings
------------------
See also :ref:`def-source-datatable`. This YAML_ file can contain the following tokens:

NameSingle
  *Text (required).* Display name referring to a single table item (single, use no starting capital).

NamePlural
  *Text (required).* Display name referring to several table items (plural, no no starting capital).

Description
  *Text (required).* A description of this dataset.
  This text will appear on the intro page, and on the table view page of this datatable.

Icon:
  *Text.* Specifies an icon that will be associated with the datatable.
  The icon name can be chosen from the list specified in http://fortawesome.github.io/Font-Awesome/icons/.

PrimKey:
  *Property ID (required)*. The primary key column ID for this table.
  This should correspond to a column in data, containing a unique value for each record.
  Optionally, this parameter can be set to 'AutoKey' to instruct the software to automatically generate a primary key.

SortDefault
  *Property ID (required)*. Specifies the property ID used as the default sort field.

CacheWorkspaceData
  *Boolean.* If Set, a materialised table will be created for this data in each workspace.
  This is faster for large datasets than the standard option, based on a JOIN statement.

MaxCountQueryRecords
  *Value.* Defines the maximum number of records that will be downloaded to the client (e.g. for creating scatterplots).

MaxCountQueryAggregated
  *Value.* Defines the maximum number of records that will be queried on the server for aggregated reports (e.g. for creating histograms).

QuickFindFields
  *Comma-separated list of property ID's.*
  The specified list of properties will be used by some tools that allow the user to quickly find a (set of) item(s).

DisableSubsets
  *Boolean.* If this is set, there will be no subsets options for this dataset.

DisablePlots
  *Boolean.* If this is set, there will be no options to create plots for this dataset.

PropertyGroups
  *List.*
  Each item in the list specifies a group of properties.
  It should contain two tags: "Id" representing a unique identifier for the group, and "Name" representing a display name.
  Property groups can be used to combine sets of related properties into sections in the app.

AutoScanProperties
  *Boolean.* If set, Panoptes will try to automatically obtain property definitions from the TAB-delimited source data file.

.. _Properties:

Properties
  *List (required)*
  The datatable yaml should contain a token "Properties", which contains a list of descriptions for all table columns used in the app.
  See `Property settings`_ for an overview of the tokens that can be used for each individual item in this list.

DataItemViews
  *List.* Definitions of custom views that will appear in the
  popup for an individual datatable item.
  Each item should contain the following token:

  Type
    *Text (required).* Identifier of the custom view type
    (can be ``Overview``, ``PropertyGroup``, ``FieldList``, ``ItemMap``, ``PieChartMap``)
    See `DataItemViews`_ for more details about these custom views.

ExternalLinks
  *List.* Each item in the list specifies a link for a data item to an external url.
  These links will show up as buttons in the data item popup window.
  An item in this list should contain the following tokens:

    Url
      *Text (required).*: Url for this link. This may include property ID's between curly braces.
      Example: ``http://maps.google.com/maps?q={Lattitude},{Longitude}``.
    Name:
      *Text (required).* Display name for this external link.

IsPositionOnGenome
  *Boolean.* Tells Panoptes that this datatabke should be interpreted as genomic positions.

IsRegionOnGenome
  *Boolean.* Instructs Panoptes that this datatable should be interpreted as genomic regions.

Chromosome
  *Property ID.* Speficies the table column ID that contains the chromosome
  (if *IsPositionOnGenome* or *IsRegionOnGenome* is set).

Position
  *Property ID.* Specifies the table column ID that contains the position on the chromosome (if *IsPositionOnGenome* is set).

RegionStart
  *Property ID.* Specifies the table column ID that contains the start position of the region (if *IsRegionOnGenome*  is set).

RegionStop
  *Property ID.* Specifies the table column ID that contains the end position of the region (if *IsRegionOnGenome*  is set).

GenomeMaxViewportSizeX
  *Value.* Specifies the maximum genome browser viewport size (in bp)
  for which data in this table will be displayed as a tracks  (if *IsPositionOnGenome* or *IsRegionOnGenome*  is set).

TableBasedSummaryValues
  *Block.*
  Declares that this datatable contains a numerical genome values for each item in the table
  Panoptes will process these using the multiresolution filterbanking, and the user can display these as tracks in the genome browser
  There should be a subfolder with the identifier of this track in the datatable source data folder.
  For each data item, this folder should contain a data file with the name equal to the primary key
  This block can contain the following tokens:

    Id
      *Text. (required)* Identifier of this per-dataitem genomic value.
    Name
      *Text (required).* Display name.
    MinVal
      *Value (required).* Minimum this value can reach.
    MaxVal
      *Value (required).* Maximum this value can reach.
    BlockSizeMin
      *Value (required).* Minimum block size used by the multiresolution summariser (in bp).
    BlockSizeMax
      *Value (required).* Maximum block size used by the multiresolution summariser (in bp).
    ChannelColor
      *Text.*: Colour used to display these tracks genome browser track. Formatted as ``"rgb(r,g,b)"``


Property settings
~~~~~~~~~~~~~~~~~
An overview of the possible tags than can be defined for an individual property in
the **Properties** tag of the datatable settings (see Properties_).

Id
  *Text (required).* Identifier of the property, corresponding to the column header in the [data] file

DataType:
  *Text (required)*. Data type of the values in the property.
  This can be ``Text``, ``Value``, ``HighPrecisionValue``, ``Boolean``,  ``GeoLongitude``, ``GeoLattitude``, ``Date``.

Name
  *Text (required).* Display name of the property.

Description
  *Text.* Description of the property. This will appear in hover tool tips and in the popup box if a user clicks on a property info button.

GroupId
  *Text.* Id of the Property group this property belongs to.

IsCategorical
  *Boolean.* Instructs Panoptes to treat the property as a categorical variable.
  For example, a combo box with the possible states is automatically shown in queries for this property.
  Categorical properties are automatically indexed.

CategoryColors
  *Block.* Specifies display colours for the categorical states of this property.
  Each token in the block links a possible value of the property to a color (for example: ``Accepted: rgb(0,192,0)``).
  The special value ``_other_`` can be used to specify a color for all other property values that are not listed.

MaxColumnWidth
  *Value.* Specifies the maximum pixel width used for the column representing this property in a table.
  Longer text will be abbreviated with ellipsis.

BarWidth
  *Value*. Draws a bar in the background of the table, indicating the value. This requires *MinVal* & *MaxVal* to be defined.

MinVal
  *Value.* For Value types, specifies the minimum value that can be reached.

MaxVal
  *Value.* For Value types, specifies the maximum value that can be reached.

DecimDigits
  *Value.* For Value types, specifies the number of decmimal digits that should be used to display the value

Index
  *Boolean.* If set, instructs Panoptes to create a database index for this property.
  For large datasets, this massively speeds up queries based on this property.

Search
  *Text.* Indicates that this field can be used for text search in the find data item wizard.
  Possible values: ``StartPattern``, ``Pattern``, ``Match``.

Relation
  *Block.* Defines a many-to-one foreign relation to a parent datatable.
  The parent table should contain a property with the same name as the key property in the child table.
  The block can contain the following tags:

    TableId
      *Datatable ID (required).* Datatable id of the relation parent table
    ForwardName
      *Text (required).* Display name of the relation from child to parent
    ReverseName
      *Text (required).* Display name of the relation from parent to child

ReadData
  *Boolean.* If set to false, this property will not be imported from the TAB-delimited source file. (*NOTE: under construction*).

CanUpdate: true
  *Boolean.* If set to true, this property can be modified by the user. (*NOTE: under construction*).

ShowInTable
  *Boolean*. If set, this property will appear by default in data table grids in the application.

ShowInBrowser
  *Boolean.* If set, this property will automatically appear as a track in the genome browser
  (only applies if *IsPositionOnGenome* is specified in database settings).

BrowserDefaultVisible
  *Boolean.* Indicates that the channel will activated by default in the genome browser (only applies if *ShowInBrowser* is set).

BrowserShowOnTop
  *Boolean.* Indicates that the channel will be shown in the top (non-scrolling) area of the genome browser.
  In this case, it will always be visible (only applies if *ShowInBrowser* is set).

ChannelName
  *Text.* Name of the genome browser channel this property will be displayed in.
  Properties sharing the same channel name will be displayed in overlay
  (only applies if *ShowInBrowser* is set).

ChannelColor
   *Text.* Colour used to display this property in the genome browser. Formatted as ``"rgb(r,g,b)"``
   (only applies if *ShowInBrowser* is set).

ConnectLines
   *Boolean.* Indicate that the points will be connected with lines in the genome browser
   (only applies if *ShowInBrowser* is set).

SummaryValues
  *Block.* Instructs Panoptes to apply a multiresolution summary algorithm for fast display of this property
  in the genome browser at any zoom level (only applies if *ShowInBrowser* is set). Possible tokens in this block:

    BlockSizeMin
      *Value (required).* Minimum summary block size (in bp)
    BlockSizeMax
      *Value (required).* Maximum summary block size (in bp)
    ChannelColor
      *Text.* Colour of the channel. Formatted as ``"rgb(r,g,b)"``.




DataItemViews
~~~~~~~~~~~~~
The token *Type* for member of the *DataItemViews* list can have the following values:

Overview
........
Specifies the default data item view of Panoptes, including all fields. Possible tokens:

Name
  *Text (required)*. Display name of this view.

PropertyGroup
.............
Displays all properties that are member of a specific property group.

GroupId
  *Text (required).* Identifier of the property group to display.

FieldList
.........
Displays a selection of properties for the data item.

Name
  *Text (required).* Display name of this view.
Introduction
  *Text.* A static text that will be displayed on top of this view.
Fields
  *List (required).* Each item in this list should be a property ID.

ItemMap
.......
Displays the item as a pin on a geographical map.
Requires the presence of properties with data type ``GeoLongitude`` and ``GeoLattitude``.

Name
  *Text (required)*. Display name of this view.
MapZoom:
  *Value (required)*. Start zoom factor of the map (integer, minimum value of 0).

PieChartMap
...........
Defines a view that shows a set of pie charts on a geographic map.
This is achieved by combining information from two datatables:

 - A locations datatable. Each item in this datatable defines a location and will display a pie chart.
 - The current datatable (where the view is defined).

A set of properties of the current table is used to define pies on all pie charts.
There has to be a property for each pie and location combination,
and the value of that property contains the relative size of that specific pie.

Name
  *Text (required)*. Display name of this view.

PieChartSize
  *Value (required).* Size of the largest pie chart

MapCenter
  *Block (required).* Specifies the start map center, and should contain the following tokens:

   Longitude
     *Value (required).* Geographic longitude.
   Lattitude
     *Value (required).* Geographic latitude.

MapZoom
  *Value (required).* Start zoom factor of the map (integer, minimum value of 0).

DataType
  *Text (required).* Type of values used to create the pie chart. Possible states: ``Fraction``.

PositionOffsetFraction
  *Value (required).* An offset between the pie chart location and the actual chart,
  used to achieve a nice (nonoverlapping) view.

LocationDataTable
  *Text (required).* ID of the datatable containing the locations (should have properties width ``GeoLongitude`` and ``GeoLattitude`` data types).

LocationSizeProperty
  *Text (required).* Property ID of the locations datatable containing the size of the pie chart.

LocationNameProperty
  *Text (required).* Property of the locations datatable containing the name of the pie chart.

ComponentColumns
  *List (required).* Enumerates all the pies of the pie charts, and binds them to properties of this datatable (one for each component x location).
  Each list item should have the following tokens:

    Pattern:
      *Text (required).* Column name providing the data. NOTE: {locid} will be replaced by the location primary key value.
    Name:
      *Text (required).* Name of the pie
    Color:
      *Text (required).* Color of the pie. Format: ``rgb(r,g,b)``.

ResidualFractionName
  *Text*. Name of the residual fraction (if any).



2D Datatable settings
---------------------
@@TODO.


Workspace settings
------------------
See also :ref:`def-source-workspace`. This YAML_ file can contain the following tokens:

Name
  *Text (required).* Display name of the workspace.

Reference genome settings
-------------------------
See also :ref:`def-source-referencegenome`. This YAML_ file can contain the following tokens:

GenomeBrowserDescr
  *Text.* Descriptive text that will be displayed in the genome browser section of the main page.

AnnotMaxViewPortSize
  *Value.* Maximum viewport (in bp) the genome browser can have in order to show the annotation track.

RefSequenceSumm
  *Boolean.* If set, a summary track displaying the reference sequence with be included in the genome browser.

Annotation
  *Block.* Directives for parsing the annotation file (annotation.gff).
  Possible member tokens:

  Format
    *Text.* File format. Possible values:
    ``GFF`` = Version 3 GFF file ; ``GTF`` = Version 2 GTF file

  GeneFeature
    *Text or List.* Feature id(s) used to identify genes.
    Example: ``[gene, pseudogene]``.

  ExonFeature
    *Text or List.* Feature id(s) used to identify exons.

  GeneNameAttribute:
    *Text.* Attribute id used to identify gene names

  GeneNameSetAttribute:
    *Text or List.* Attribute id(s) used to identify gene name sets.
    Example: ``[Name,Alias]``.

  GeneDescriptionAttribute
    *Text or List.* description # Attribute id(s) used to identify gene descriptions

ExternalGeneLinks:
  *List.* Each item in the list specifies a link for a gene to an external url.
  These links will show up as buttons in the gene popup window.
  An item in this list should contain the following tokens:

    Url
      *Text (required).*: Url for this link.
      This may include ``{Id}`` to refer to the gene identifier.
      Example: ``https://www.google.co.uk/search?q={Id}``.
    Name:
      *Text (required).* Display name for this external link.


Custom data settings
--------------------
See also :ref:`def-source-customdata`. This YAML_ file can contain the following tokens:

AutoScanProperties
  *Boolean.* If set, Panoptes will try to automatically obtain property definitions from the TAB-delimited source data file.

PropertyGroups
  *List.*
  Each item in the list specifies a group of properties.
  It should contain two tags: "Id" representing a unique identifier for the group, and "Name" representing a display name.
  Property groups can be used to combine sets of related properties into sections in the app.

Properties
  *List (required)*
  The datatable yaml should contain a token "Properties", which contains a list of descriptions for all columns used in the app for this custom data table.
  See `Property settings`_ for an overview of the tokens that can be used for each individual item in this list.

DataItemViews
  *List.* Definitions of custom views that will appear in the
  popup for an individual datatable item. The views defined at the level of this
  custom data source will be added to the standard data item popup.
  Each item in the list should contain the following token:

  Type
    *Text (required).* Identifier of the custom view type
    (can be ``Overview``, ``PropertyGroup``, ``FieldList``, ``ItemMap``, ``PieChartMap``)
    See `DataItemViews`_ for more details about these custom views.
