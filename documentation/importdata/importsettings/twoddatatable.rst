.. _YAML: http://www.yaml.org/about.html

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
NameSingle
  *Text (required).* Display name referring to data of an individual cell (single, without starting capital).

NamePlural
  *Text (required).* Display name referring to data of several cells (plural, without starting capital).

Description
  *Text (required).* A short description of this 2D data table.
  Note: this text may contain documentation links (see :ref:`def-source-docs`).


ColumnDataTable
  *Text (required).* Identifier of the (1D) data table defining the columns of the matrix
  (In case of genotype data: the variants). This links the 2D data table to the 1D data table containing the column information.

ColumnIndexField
  *Text (required).* The property ID in the ``ColumnDataTable`` data table that maps into the ``ColumnIndexArray``
  array in the HDF5 source file. ``ColumnIndexField`` and ``ColumnIndexArray`` together establish the link between the column data table values, and the data present in the HDF5 source file.
  Note that "AutoKey" can be used if your rows do not have Unique IDs

ColumnIndexArray
  *Text.* 1D Array in the HDF5 source file that gives the value of ``ColumnDataField`` for each column. [@@TODO_GN: shouldn't this be ColumnIndexField?]
  If this is missing then it is assumed that the HDF5 columns are in the same
  order as the ``ColumnDataTable`` data table, sorted by the ``ColumnIndexField`` property.

RowDataTable
  *Text (required).* Identifier of the (1D) data table defining the rows of the matrix
  (in case of genotype data: the samples). This links the 2D data table to the 1D data table containing the row information.

RowIndexField
  *Text (required).* The property ID in the ``RowDataTable`` data table that maps into ``RowIndexArray``
  array in the HDF5 source file. ``RowIndexField`` and ``RowIndexArray`` together establish the link between the row data table values, and the data present in the HDF5 source file.
  Note that "AutoKey" can be used if your rows do not have Unique IDs

RowIndexArray
  *Text.* 1D Array in the HDF5 source file that gives the value of ``RowDataField`` for each row. [@@TODO_GN: shouldn't this be RowIndexField?]
  If this is missing then it is assumed that the HDF5 rows are in the same
  order as the ``RowDataTable`` data table, sorted by the ``RowIndexField`` property.

FirstArrayDimension
  Either 'row' or 'column' to indicate the first dimension in the HDF5 array.
  'column' will generally perform better.

ShowInGenomeBrowser
  *Block.* If this key is present, the data will be visualised as a channel in the genome browser.
  This requires that data table used as ``ColumnDataTable`` is defined as "IsPositionOnGenome" (see :ref:`def-settings-datatable`)
  This key contains the following subkeys:

    Type
       *Text (required)* Possible values:

       diploid
          Genotype calls for two alleles are reported.
          Can be used for diploid organisms.

       fractional
          The fraction of reference and non-reference reads at the variant position are reported.
          Can be used for monoploid organisms with mixed states.

    FirstAllele
       *Text.* Reference to the 2D data table property that contains first allele information (in case of diploid data).

    SecondAllele
       *Text.* Reference to the 2D data table property that contains second allele information (in case of diploid data).

    Ref
       *Text.* 2D data table property containing the reference read count (in case of fractional data).

    NonRef
       *Text.* 2D data table property containing the non-reference read count (in case of fractional data).

    DepthMin
       *Value.* Minimum coverage depth displayed in the genotype channel.

    DepthMax
       *Value.* Maximum coverage depth displayed in the genotype channel.

    ExtraProperties
      *List.* A list of the extra 2D data table properties that are displayed in the genotype channel.

GenomeMaxViewportSizeX
  *Value.* Maximum size of the genome browser viewport (in bp) for which genotype calls will be displayed.

Properties:
   *List (required).* Contains a list of all properties defined for each cell of the 2D data table.
   An item in this list can have the following keys:


   Id
     *Text (required).* Identifier of the property, and name of the dataset in the HDF5 source file.

   Name
     *Text.* Display name of this property.

   Description
     *Text.* Short description of this property.
