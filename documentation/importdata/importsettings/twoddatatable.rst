.. _YAML: http://www.yaml.org/about.html

.. _def-settings-twoddatatable:

2D Datatable settings
~~~~~~~~~~~~~~~~~~~~~


This YAML_ file contains settings for :ref:`genotype data<dataconcept_genotype>`. See also:

- :ref:`data-import-settings`
- `Example file
  <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Genotypes/2D_datatables/genotypes/settings>`_

Possible keys
.............
NameSingle
  *Text (required).* Display name referring to an individual genotype call (single, without starting capital).

NamePlural
  *Text (required).* Display name referring to several genotype call (plural, without starting capital).

Description
  *Text (required).* A short description of this genotype data set.
  Note: this text may contain documentation links (see :ref:`def-source-docs`).


ColumnDataTable
  *Text (required).* Identifier of the data table where each item corresponds to a column (the variants).

ColumnIndexField
  *Text (required).* The column name in the ``ColumnDataTable`` data table that maps into ``ColumnIndexArray``
  Note that "AutoKey" can be used if your rows do not have Unique IDs

ColumnIndexArray
  *Text.* 1D Array in the HDF5 source file that gives the value of ColumnDataField for each column.
  If this is missing then it is assumed that the HDF5 columns are in the same
  order as the``ColumnDataTable`` sorted by ``ColumnIndexField``.

RowDataTable
  *Text (required).* Identifier of the data table where each item corresponds to a row (the samples / sequences).

RowIndexField
  *Text (required).* The column name in RowDataTable that maps into RowIndexArray.
  Note that "AutoKey" can be used if your rows do not have Unique IDs

RowIndexArray
  *Text.* 1D Array in the HDF5 source file that gives the value of RowDataField for each row.
  If this is missing then it is assumed that the HDF5 rows are in the same
  order as the ``RowDataTable`` sorted by ``RowIndexField``.

FirstArrayDimension
  Either 'row' or 'column' to indicate the first dimension in the HDF5 array.
  For example, array[1] == 'a row' or array[1] == 'a column' 'column' will generally perform better. @@TODO_GN: clarify?

ShowInGenomeBrowser
  *Block.* If this key is present, the data will be visualised in the genome browser.
  This requires that data table used as ``ColumnDataTable`` is defined as "IsPositionOnGenome" (see :ref:`def-settings-datatable`)
  This key contains a may have the following subkeys:

    Type
       *Text (required)* Possible values:

       diploid
          Genotype calls for two alleles are reported.
          Can be used for diploid organisms.

       fractional
          The fraction of reference and non-reference reads at the variant position are reported.
          Can be used for monoploid organisms with mixed states.

    FirstAllele
       *Text.* Reference to the genotype property that contains first allele information (in case of diploid data).

    SecondAllele
       *Text.* Reference to the genotype property that contains second allele information (in case of diploid data).

    Ref
       *Text.* Genotype property containing the reference read count (in case of fractional data).

    NonRef
       *Text.* Genotype property containing the non-reference read count (in case of fractional data).

    DepthMin
       *Value.* Minimum coverage depth displayed in the genotype channel.

    DepthMax
       *Value.* Maximum coverage depth displayed in the genotype channel.

    ExtraProperties
      *List.* A list of the extra genotype properties that are displayed in the genotype channel.

GenomeMaxViewportSizeX: 5000

Properties:
   *List (required).* Contains a list of all properties defined for each genotype call.
   An item in this list can have the following keys:


   Id
     *Text (required).* Identifier of the property, and name of the dataset in the HDF5 source file.

   Name
     *Text.* Display name of this property.

   Description
     *Text.* Short description of this property.
