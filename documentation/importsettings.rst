====================
Data import settings
====================

General dataset settings
------------------------

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

NameSingle
  *Text (required).* Display name referring to a single table item (single, use no starting capital).

NamePlural
  *Text (required).* Display name referring to several table items (plural, no no starting capital).

Description 
  *Text (required).* A description of this dataset.
  This text will appear on the intro page, and on the table view page of this datatable.

CacheWorkspaceData
  *Boolean.* If Set, a materialised table will be created for this data in each workspace.
  This is faster for large datasets than the standard option, based on a JOIN statement.

Icon:
  *Text.* Specifies an icon that will be associated with the datatable.
  The name can be chosen from http://fortawesome.github.io/Font-Awesome/icons/.

PrimKey:
  *Property ID (required)*. The primary key column ID for this table.
  This should correspond to a column in data, containing a unique value for each record.
  Optionally, this parameter can be set to 'AutoKey' to instruct the software to automatically generate a primary key.

SortDefault
  *Property ID (required)*. Specifies the property ID used as the default sort field.


MaxCountQueryRecords
  *Value.* Defines the maximum number of records that will be downloaded to the client (e.g. for creating scatterplots).

MaxCountQueryAggregated
  *Value.* Defines the maximum number of records that will be queried on the server for aggregated reports (e.g. for creating histograms).

QuickFindFields
  *Comma-separated list of property ID's.*
  The specified list of properties will be used by some tools that allow the user to quickly find a (set of) item(s).


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


IsPositionOnGenome
  *Boolean*. Tells Panoptes that this should be interpreted as genomic positions.

Chromosome
  *Property ID.* Speficies the table column ID that contains the chromosome (if *IsPositionOnGenome* is set).

Position
  *Property ID.* Specifies the table column ID that contains the position on the chromosome (if *IsPositionOnGenome* is set).

GenomeMaxViewportSizeX
  *Value.* Specifies the maximum genome browser viewport size (in bp)
  for which data in this table will be displayed as a tracks  (if *IsPositionOnGenome* is set).

TableBasedSummaryValues
  *Block. *
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

Name
  *Text (required).* Display name of the property.

DataType:
  *Text (required)*. Data type of the values in the property.
  This can be ``Text``, ``Value``, ``HighPrecisionValue``, ``Boolean``,  ``GeoLongitude``, ``GeoLattitude``, ``Date``.

GroupId
  *Text.* Id of the Property group this property belongs to.

Description
  *Text.* Description of the property. This will appear in hover tool tips and in the popup box if a user clicks on a property info button.
  
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
  


2D Datatable settings
---------------------

Workspace settings
------------------

Reference genome settings
-------------------------

Custom data settings
--------------------
