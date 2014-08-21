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


.. _Properties:
Properties
  *List (required)*
  The datatable yaml should contain a token "Properties", which contains a list of descriptions for all table columns used in the app. 
  See `Property settings`_ for an overview of the tokens that can be used for each individual item in this list.


*The following set of tags is used to define the items in a datatable as positions on the genome.*

IsPositionOnGenome
  *Boolean*. Tells Panoptes that this should be interpreted as genomic positions

Chromosome
  *Property ID.* Speficies the table column ID that contains the chromosome

Position
  *Property ID.* Specifies the table column ID that contains the position on the chromosome

GenomeMaxViewportSizeX
  *Value.* Specifies the maximum genome browser viewport size (in bp) for which data in this table will be displayed as a tracks.


Property settings
-----------------
An overview of the possible tags than can be defined for an individual property in
the **Properties** tag of the datatable settings (see Properties_).

Id
  *Text (required).* Identifier of the property, corresponding to the column header in the [data] file

Name
  *Text (required).* Display name of the property.

DataType:
  *Text (required)*. Data type of the values in the property.
  This can be ``Text``, ``Value``, ``Boolean``,  ``GeoLongitude``, ``GeoLattitude``, ``Date``.

GroupId
  *Text.* Id of the Property group this property belongs to.

Description
  *Text.* Description of the property. This will appear in hover tool tips and in the popup box if a user clicks on a property info button.

ShowInTable
  *Boolean*. If set, this property will appear by default in data table grids in the application.
  
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
