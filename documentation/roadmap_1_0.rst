Roadmap: 1.0 release
====================

The 1.0 release is a major release. The following features are in scope.


Filesystem-based data import and dataset configuration
------------------------------------------------------

In many cases it would be more convenient for users to be able to add
data to a dataset and configure various properties of the data by
working directly with a shared filesystem, e.g., copying source data
to an NFS mounted share and configuring via YAML configuration files.

Implement a set of conventions for creating datasets, adding tables to
a dataset, and configuring tables (e.g., specifying column types), by
working directly with a filesystem shared between the user and a
panoptes instance.


Linking tables
--------------

In scope for this release is a set of features around linking tables
via foreign key one-to-many relationships.

Extend the YAML configuration language for a data table to enable
specification of a foreign key relatonship to another data table.

Extend the UI to enable navigation between linked data items. 

E.g., in the data table UI, when viewing a table with a link to
another table, the values in the column which contains the foreign key
values become hyperlinks. Clicking on the hyperlink raises a popup
containing information about the linked data item in the other table.

E.g, in data item popups, properties of the item are displayed as
normal, and if the item has links to other items, the properties of
linked items are also displayed.


Map visualisations of geospatial data
-------------------------------------

Displaying data on a map is a common requirement for many domains. In
some cases data may also have a temporal component as well as a
spatial component. In scope for this release is a preliminary set of
features around map-based visualisations.

Extend the YAML configuration to enable specifying that a column in a
table contains geospatial coordinate values. Similarly for a column
with temporal values (e.g., year).

For tables with geospatial coordinates, extend the UI to provide
various features for displaying data from the table on a map.

E.g., the simplest case is to show all data items as bubbles on a
map. Where data items have the same location, implement a
visualisation that makes it apparent multiple items are colocated.

Further development of the map visualisations UI to enable rendering
of summarised data on a map, e.g., pie charts for some categorical
property aggregated at some spatial scale.

Extend the UI for map visualisations to enable integration of spatial
and temporal data. E.g., show a timeline and enable selection of data
items based on a time range.


Position-based genotype visualisation
-------------------------------------

Visualisaton of genotype calls for a set of biological samples over a
set of genetic variants (e.g., SNPs, indels) is in scope for this
release.
  
Proposed to implement a visualisation component which could be added
to a genome browser page, such that a set of genotype calls is
rendered as a genome browser track and could be viewed alongside other
genome-based data tracks.

In the default rendering a set of genotype calls for a variant are
rendered as a column of colour blocks centred at the variant
position. The colour of the block represents the genotype
call. Physical space between variants appears as blank space between
columns. Where columns become crowded, enable columns to be shifted
left or right to fill any available space.

An option is provided to switch the UI to a space-filling
representation, where physical space between variants is collapsed and
the columns are rendered as a rectangular grid. However, navigation is
still based on genome position, i.e., dragging and zooming operates in
genome position coordinate space.

Lines are drawn above and below the genotype grid connecting each
column to its physical location in genome coordinate space.

In either rendering mode, if there are more columns than available
pixels, a message is shown informing the user that they need to zoom
in.

Both categorical (e.g., diploid) and continuous (e.g., mixture)
genotype calls are supported. Only biallelic are in scope for this
release, multiallelics will be considered in future releases.

A second array of the same shape as the array of genotype calls (such
as depth or genotype quality) can be configured to control the alpha
channel.

The genotype calls can be provided as a 2-dimensional array within an
HDF5 file, as a 2-dimensional numpy array saved as a .npy file, or as
a tab-delimited text file where columns represent samples and rows
represent variants.

The genotype array must be connected to an existing table of variants
and an existing table of samples. A field from the variants table can
be chosen to label the columns in the genotype grid and a field from
the samples table can be chosen to label the rows.

By default the height of the rows in the genotype grid is set based on
font height, i.e., such that row labels can be read and don't
overlap. An option is provided to collapse rows down to a minimal
size, e.g., 1px high.

When hovering over a genotype call, the actual genotype call and
values from any associated arrays (e.g., depth) are displayed
somewhere. When clicking on a genotype call, a popup appears with all
available data about the genotype call, the variant and the sample,
and some action buttons to further investigate either the variant or
the sample.

A query can be applied over the associated samples table to choose
which rows will appear. Rows for samples not in the query results are
removed from the grid. The selection of samples query is made
independently of any other tracks on the genome browser which also
involve a samples selection. I.e., different tracks can be showing
different selections of samples.

A query can be applied over the associated variants table to choose
which columns will appear. Columns for variants not in the query
results are removed from the grid. The selection of variants query is
independent of any other genome browser tracks which involve a
variants query. I.e., different tracks can be showing different
selections of variants.

When sufficiently zoomed in, the actual data values (e.g., genotype
call value) are displayed as text within the colour block.

Configuration of which array controls genotype, which array (if any)
controls alpha, how data values are mapped to colour and alpha values,
is all done via YAML configuration, i.e., no UI options to change.


