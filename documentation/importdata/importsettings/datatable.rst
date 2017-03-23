.. _YAML: http://www.yaml.org/about.html

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

nameSingle
  *Text (required).* Display name referring to a single table item (single, without starting capital).

namePlural
  *Text (required).* Display name referring to several table items (plural, without starting capital).

description
  *Text.*  Default:.  A short description of this data table.
  This text will appear on the intro page, and on the table view page of this data table.
  Note: this text may contain documentation links (see :ref:`def-source-docs`).

icon
  *Text.* Specifies an icon that will be associated with the data table.
  The icon name can be chosen from the list specified in http://fortawesome.github.io/Font-Awesome/icons/.

hdfPath
  *Text.* If the data source is HDF5 then this can be used to specify the path within the HDF5 file to the arrays.

isHidden
  *Boolean.* If set to true, the data table will not be displayed as a standalone entity
  (i.e. not mentioned on the intro page and no tab).

primKey
  *PropertyID (required).* The primary key *property ID* for this table.
  A data item *property* is a column in the TAB-delimited source file ``data``, and the *ID* corresponds to the column header.
  The primary key should refer to a column containing a unique value for each record in the table.
  Optionally, this parameter can be set to '``AutoKey``' to instruct the software to automatically generate a primary key.

itemTitle
  *Text.* A  `handlebars <http://handlebarsjs.com/>`_ template. Defaults to the primary key.
  The rendered template will be used when a data item title is needed.

sortDefault
  *PropertyID.* Specifies the property ID (i.e. column name in the ``data`` source file) used as the default sort field..

defaultQuery
  *Text.* Specifies the default query used thoughout the app for this table..

storedQueries
  *List.*  Default:[].  A list of queries to be displayed in the app for this table.
  The block can contain the following keys:
    query
      *Text (required).* a query string.

    name
      *Text (required).* a display name for this query.


fetchRecordCount
  *Boolean.*  Default:False.  .

quickFindFields
  *PropertyIDs.* The list of properties will be used by some tools in the software that allow the user to quickly find a (set of) item(s).

previewProperties
  *PropertyIDs.* The list of properties that will be shown (along with the primary key) when the item is previewed such as in genome browser .

disableSubsets
  *Boolean.* If set, there will be no subsets options for this data table.

disablePlots
  *Boolean.* If set, there will be no options to create plots for this data table.

disableNotes
  *Boolean.* If set, it will not be possible to define notes for items in this data table.

propertyGroups
  *List.*  Default:[].  Each item in the list specifies a group of properties.
  Property groups are used to combine sets of related properties into logical sections in the app.
  The block can contain the following keys:
    id
      *Text (required).* a unique identifier for the group.

    name
      *Text (required).* a display name.


.. _Properties:
properties
  *List (required).* Each list item defines a :ref:`property<dataconcept_property>`, linked to a column in the TAB-delimited source file ``data``.
  See :ref:`def-settings-datatable-properties` settings for an overview of the keys that can be used for each property in this list.

dataItemViews
  *List.* Definitions of custom views that will appear in the popup for an individual data table item.
  The block can contain the following keys:
    type
      *Text (required).* Identifier of the custom view type
    (can be ``Overview``, ``PropertyGroup``, ``FieldList``, ``ItemMap``, ``PieChartMap``)
    See :ref:`def-settings-datatable-dataitemviews` for more details about defining custom data item views.


externalLinks
  *List.* Each item in the list specifies a link for a data item to an external url.
  These links show up in the app as buttons in the data item popup window.
  The block can contain the following keys:
    url
      *Text (required).* Url for this link. This may include tokens property ID's between curly braces.
       These tokens will be expanded to their actual content for a specific data item.
       Example: ``http://maps.google.com/maps?q={Latitude},{Longitude}``.

    name
      *Text (required).* Display name for this external link.


listView
  *Boolean.*  Default:False.  Replaces the normal table view with a list view, showing rows on left and a single selected row on the right.

isPositionOnGenome
  *Boolean.*  Default:False.  Instructs Panoptes that records in this data table should be interpreted as genomic positions.
  In this case, the *Chromosome* and *Position* keys should be defined.

isRegionOnGenome
  *Boolean.*  Default:False.  Instructs Panoptes that records in this datatable should be interpreted as genomic regions.
  In this case, the *Chromosome*, *RegionStart* and *RegionStop* keys should be defined.

chromosome
  *PropertyID.*  Default:chrom.  Specifies the table column ID that contains the chromosome
  (only to be used if *IsPositionOnGenome* or *IsRegionOnGenome* is set).
  Note that the values in this column should correspond to the content of fasta file
  (see :ref:`def-source-referencegenome`).

position
  *PropertyID.*  Default:pos.  Specifies the table column ID that contains the position on the chromosome
  (only to be used if *IsPositionOnGenome* is set).

regionStart
  *PropertyID.*  Default:start.  Specifies the table column ID that contains the start position of the region
  (only to be used if *IsRegionOnGenome* is set).

regionStop
  *PropertyID.*  Default:stop.  Specifies the table column ID that contains the end position of the region
  (only to be used if *IsRegionOnGenome* is set).

browserDefaultVisible
  *Boolean.* For genomic regions: specifies the default visibility status of this data table in the genome browser
  (only to be used if *IsRegionOnGenome* is set).
  Note that, for genomic position, default visibility is specified on a per-property basis.

maxTableSize
  *Value.*  Default:None.  .

browserDefaultLabel
  *PropertyID.* Specifies the default label that is used in the genome browser, used for genomic regions.
  None indicates that no label is displayed by default.

tableBasedSummaryValues
  *List.*  Default:[].  Declares that numerical genome values for are available for each item in the table.
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
.
  The block can contain the following keys:
    id
      *Text (required).* Identifier of this set of per-data-item genomic values - name of subdirectory or Identifier of this set of per-data-item genomic values - name of the column in the matching files.

    filePattern
      *Text.* A glob (regular expression) containing a relative path to the file(s).

    name
      *Text (required).* Display name of the property.

    minVal
      *Value (required).*  Default:0.  Value used for lower extent of scales.

    maxVal
      *Value (required).* Value used for upper extent of scales.

    blockSizeMin
      *Value (required).*  Default:1.  Minimum block size used by the multiresolution summariser (in bp).

    blockSizeMax
      *Value (required).* Maximum block size used by the multiresolution summariser (in bp).

    channelColor
      *Text.* Colour used to display these tracks as a genome browser track. Formatted as ``"rgb(r,g,b)"``.





.. toctree::
  :maxdepth: 1

  datatable_properties
  datatable_dataitemviews

