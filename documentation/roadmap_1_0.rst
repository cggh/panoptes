Roadmap: 1.0 release
====================

The 1.0 release is a major release. The following features are in scope.


Linking tables
--------------

In scope for this release is a set of features around linking tables
via foreign key relationships.

Extend the YAML configuration language for a data table to enable
specification of a foreign key relatonship to another data table.

In the data table UI, when viewing a table with a link to another
table, the values in the column which contains the foreign key values
become hyperlinks. Clicking on the hyperlink raises a popup containing
information about the linked entity in the other table.

In entity popups, properties of the entity are displayed as normal,
and if the entity has links to other entities, the properties of
linked entities are also displayed. I.e., the links between entities
can be navigated forwards and backwards.

@@TODO further features


Geospatial data & map visualisations
------------------------------------

@@TODO describe this feature set


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
columns.

An option is provided to switch the UI to a space-filling
representation, where physical space between variants is collapsed and
the columns are rendered as a rectangular grid. However, navigation is
still based on genome position, i.e., dragging and zooming operates in
genome position coordinate space.

Both categorical (e.g., diploid) and continuous (e.g., mixture)
genotype calls are supported. In the diploid case each possible
genotype state is mapped to a discrete colour. In the continuous case
the reference allele fraction is mapped to a colour. Only biallelic
are in scope for this release, multiallelics will be considered in
future releases.

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
removed from the grid.

A query can be applied over the associated variants table to choose
which columns will appear. Columns for variants not in the query
results are removed from the grid.

