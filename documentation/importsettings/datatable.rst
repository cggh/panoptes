.. _YAML: http://www.yaml.org/about.html

.. _def-settings-datatable:

Data table settings
------------------

This YAML_ file contains settings for a :ref:`def-source-datatable`, and may contain the following keys:

NameSingle
  *Text (required).* Display name referring to a single table item (single, without starting capital).

NamePlural
  *Text (required).* Display name referring to several table items (plural, without starting capital).

Description
  *Text (required).* A short description of this data table.
  This text will appear on the intro page, and on the table view page of this data table.

Icon:
  *Text.* Specifies an icon that will be associated with the data table.
  The icon name can be chosen from the list specified in http://fortawesome.github.io/Font-Awesome/icons/.

PrimKey:
  *Property ID (required)*. The primary key *property ID* for this table.
  A data item *property* is a column in the TAB-delimited source file ``data``, and the *ID* corresponds to the column header.
  The primary key should refer to a column containing a unique value for each record in the table.
  Optionally, this parameter can be set to '``AutoKey``' to instruct the software to automatically generate a primary key.

SortDefault
  *Property ID (required)*. Specifies the property ID (i.e. column name in the ``data`` source file) used as the default sort field.

CacheWorkspaceData
  *Boolean.* If set, a materialised table will be created in the relational database for this data in each workspace.
  For large data tables (>1M records), this option is faster than the standard option, which uses a JOIN statement.

MaxCountQueryRecords
  *Value.* Defines the maximum number of records that will be downloaded to the client.
  This limit influences views that display individual data items, such as scatter plots and geographical map views.
  If not specified, this defaults to 200'000.

MaxCountQueryAggregated
  *Value.* Defines the maximum number of records that will be queried on the server for views that present
  data items in an aggregated way, such as histograms and bar graphs.
  If not specified, this defaults to 1'000'000.

QuickFindFields
  *Comma-separated list of property ID's.*
  The list of properties will be used by some tools in the software that allow the user to quickly find a (set of) item(s).

DisableSubsets
  *Boolean.* If set, there will be no subsets options for this data set.

DisablePlots
  *Boolean.* If set, there will be no options to create plots for this data set.

PropertyGroups
  *List.*
  Each item in the list specifies a group of properties.
  Property groups are used to combine sets of related properties into logical sections in the app.
  A list item should contain two keys: **Id** specifying a unique identifier for the group, and **Name** representing a display name.


AutoScanProperties
  *Boolean.* If set, Panoptes will try to automatically obtain property definitions from the TAB-delimited source file ``data``.

.. _Properties:

Properties
  *List (required)*
  The datatable yaml should contain a key "Properties", containing a list of descriptions for all table columns used in the app.
  See :ref:`def-settings-datatable-properties` for an overview of the keys that can be used for each individual item in this list.

DataItemViews
  *List.* Definitions of custom views that will appear in the popup for an individual data table item.
  Each item should contain the following key:

  Type
    *Text (required).* Identifier of the custom view type
    (can be ``Overview``, ``PropertyGroup``, ``FieldList``, ``ItemMap``, ``PieChartMap``)
    See :ref:`def-settings-datatable-dataitemviews` for more details about defining custom data item views.

ExternalLinks
  *List.* Each item in the list specifies a link for a data item to an external url.
  These links show up in the app as buttons in the data item popup window.
  An item in this list should contain the following keys:

    Url
      *Text (required).*: Url for this link. This may include tokens property ID's between curly braces.
      These tokens will be expanded to their actual content for a specific data item.
      Example: ``http://maps.google.com/maps?q={Lattitude},{Longitude}``.
    Name:
      *Text (required).* Display name for this external link.

IsPositionOnGenome
  *Boolean.* Instructs Panoptes that records in this data table should be interpreted as genomic positions.
  In this case, the *Chromosome* and *Position* keys should be defined.

IsRegionOnGenome
  *Boolean.* Instructs Panoptes that records in this datatable should be interpreted as genomic regions.
  In this case, the *Chromosome*, *RegionStart* and *RegionStop* keys should be defined.

Chromosome
  *Property ID.* Specifies the table column ID that contains the chromosome
  (only to be used if *IsPositionOnGenome* or *IsRegionOnGenome* is set).
  Note that the values in this column should correspond to the content of the ``chromosomes`` source file
  (see :ref:`def-source-referencegenome`).

Position
  *Property ID.* Specifies the table column ID that contains the position on the chromosome
  (only to be used if *IsPositionOnGenome* is set).

RegionStart
  *Property ID.* Specifies the table column ID that contains the start position of the region
  (only to be used if *IsRegionOnGenome*  is set).

RegionStop
  *Property ID.* Specifies the table column ID that contains the end position of the region
  (only to be used if *IsRegionOnGenome*  is set).

GenomeMaxViewportSizeX
  *Value.* Specifies the maximum genome browser viewport size (in bp)
  for which individual data points from this table will be displayed in the tracks.
  (only to be used if *IsPositionOnGenome* or *IsRegionOnGenome*  is set).


TableBasedSummaryValues
  *Block.*
  Declares that numerical genome values for are available for each item in the table.
  Panoptes will process these using the multiresolution filterbanking, and the user can display these as tracks in the genome browser.
  A typical use case is if the data table contains samples that were sequenced, and there is coverage data available for each sample.

  There should be a subdirectory named after the identifier of this track in the data table source data folder.
  For each data item, this directory should contain a data file with the name equal to the primary key
  (see `example <https://github.com/cggh/panoptes/tree/master/sampledata/datasets/Samples_and_Variants/datatables/samples/SampleSummary1>`_).
  This block can contain the following keys:

    Id
      *Text. (required)* Identifier of this set of per-data-item genomic values.
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
      *Text.*: Colour used to display these tracks as a genome browser track. Formatted as ``"rgb(r,g,b)"``




.. toctree::
  :maxdepth: 1

  datatable_properties
  datatable_dataitemviews


