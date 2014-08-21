====================
Data import settings
====================

General dataset settings
------------------------

Name : String : Required
  The visible name of the dataset, as it appears in the intro page.
  
  Sub1:
     Description
  Sub2:
     Description

NameBanner : String
  Visible name of the dataset, as it appears in the top banner of the app.

**Name** (*required*): The visible name of the dataset, as it appears in the intro page.

**NameBanner**: Visible name of the dataset, as it appears in the top banner of the app.

**Description** (*required*):
A description of the dataset that will appear on the start page.

**DataTables**:
A list of the data table identifiers in the dataset.
These names should correspond to directory names in the datatables source directory. 
This can be included in the settings to provide an explicit ordering of the data tables.
If this tag is not provided, a default ordering wil be used.

Datatable settings
------------------

**NameSingle**  (*required*): 
Display name referring to a single table item (single, use no starting capital).

**NamePlural**  (*required*): 
Display name referring to several table items (plural, no no starting capital).

**Description**  (*required*): 
A description of this dataset. This text will appear on the intro page, and on the table view page of this datatable.

**CacheWorkspaceData**: Yes/No. 
If Set, a materialised table will be created for this data in each workspace.
This is faster for large datasets than the standard option, based on a JOIN statement.

**Icon**: Specifies an icon that will be associated with the datatable. The name can be chosen from http://fortawesome.github.io/Font-Awesome/icons/.

**PrimKey** (*required*):
The primary key column ID for this table. This should correspond to a column in data, containing a unique value for each record.
Optionally, this parameter can be set to 'AutoKey' to instruct the software to automatically generate a primary key.

**SortDefault** (*required*):
Specify a property ID as the default sort field.


# The following tags set limits on the data volumes that can be queried
**MaxCountQueryRecords**: Number.
Defines the maximum number of records that will be downloaded to the client (e.g. for creating scatterplots).

**MaxCountQueryAggregated**: Number.
Defines the maximum number of records that will be queried on the server for aggregated reports (e.g. for creating histograms).

**QuickFindFields**: Comma-separated list of property ID's.
The specified list of properties will be used by some tools that allow the user to quickly find a (set of) item(s).



**PropertyGroups** List:
Each item in the list specifies a group of properties. 
It should contain two tags: "Id" representing a unique identifier for the group, and "Name" representing a display name.
Property groups can be used to combine sets of related properties into sections in the app.


Properties
~~~~~~~~~~
The datatable yaml should contain a token "Properties", which contains a list of descriptions for all table columns used in the app. 
Each item in this list can contain the following tokens:

**Id**:
Identifier of the property, corresponding to the column header in the [data] file

**Name**:
Display name of the property

**GroupId:**
XXXX

**Description**:
Description of the property

**DataType**:
Data type of the values in the property. This can be Text, Value, Boolean,  GeoLongitude, GeoLattitude, Date

**ShowInTable**: Yes/No
If set, this property will appear by default in data table grids in the application


Genome-specific tags
~~~~~~~~~~~~~~~~~~~~
The following set of tags is used to define the items in a datatable as positions on the genome.
**IsPositionOnGenome**: Yes/No
Tells Panoptes that this should be interpreted as genomic positions

**Chromosome**: 
Speficies the table column ID that contains the chromosome

**Position**:
Specifies the table column ID that contains the position on the chromosome

**GenomeMaxViewportSizeX**: Number.
Specifies the maximum genome browser viewport size (in bp) for which this will be displayed as a track


2D Datatable settings
---------------------

Workspace settings
------------------

Reference genome settings
-------------------------

Custom data settings
--------------------
