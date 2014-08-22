.. _YAML: http://www.yaml.org/about.html

.. _def-settings-datatable:

Datatable settings
------------------

.. toctree::
   :maxdepth: 1

   datatable_properties
   datatable_dataitemviews


This YAML_ file contains settings for a :ref:`def-source-datatable`, and may contain the following tokens:

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
  See :ref:`def-settings-datatable-properties` for an overview of the tokens that can be used for each individual item in this list.

DataItemViews
  *List.* Definitions of custom views that will appear in the
  popup for an individual datatable item.
  Each item should contain the following token:

  Type
    *Text (required).* Identifier of the custom view type
    (can be ``Overview``, ``PropertyGroup``, ``FieldList``, ``ItemMap``, ``PieChartMap``)
    See :ref:`def-settings-datatable-dataitemviews` for more details about these custom views.

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






