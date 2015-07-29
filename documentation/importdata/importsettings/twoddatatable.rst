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
  *Text.*  Default:.  A short description of this 2D data table.
  Note: this text may contain documentation links (see :ref:`def-source-docs`).

ColumnDataTable
  *Text (required).* Identifier of the (1D) data table defining the columns of the matrix
  (In case of genotype data: the variants). This links the 2D data table to the 1D data table containing the column information.

ColumnIndexField
  *Text (required).* The property ID in the ``ColumnDataTable`` data table that maps into the ``ColumnIndexArray``
  array in the HDF5 source file. ``ColumnIndexField`` and ``ColumnIndexArray`` together establish the link between the column data table values, and the data present in the HDF5 source file.
  Alternatively ``ColumnIndexArray`` can be omitted implying that the columns in HDF5 are in the same order as ``ColumnIndexField`` sorted.
  Note that "AutoKey" can be used if your rows do not have Unique IDs.

ColumnIndexArray
  *Text.* 1D Array in the HDF5 source file that gives the value of ``ColumnIndexField`` for each column.
  If this is omitted then it is assumed that the HDF5 columns are in the same
  order as the ``ColumnDataTable`` data table, sorted by the ``ColumnIndexField`` property.

RowDataTable
  *Text (required).* Identifier of the (1D) data table defining the rows of the matrix
  (in case of genotype data: the samples). This links the 2D data table to the 1D data table containing the row information.

RowIndexField
  *Text (required).* The property ID in the ``RowDataTable`` data table that maps into ``RowIndexArray``
  array in the HDF5 source file. ``RowIndexField`` and ``RowIndexArray`` together establish the link between the row data table values, and the data present in the HDF5 source file.
  Alternatively ``RowIndexArray`` can be omitted implying that the rows in HDF5 are in the same order as ``RowIndexField`` sorted.
  Note that "AutoKey" can be used if your rows do not have Unique IDs.

RowIndexArray
  *Text.* 1D Array in the HDF5 source file that gives the value of ``RowIndexField`` for each row.
  If this is omitted then it is assumed that the HDF5 columns are in the same
  order as the ``RowDataTable`` data table, sorted by the ``RowIndexField property``.

FirstArrayDimension
  *Text.* Either 'row' or 'column' to indicate the first dimension in the HDF5 array.
  'column' will generally perform better.
  Possible values:

  - ``row``: .
  - ``column``: .

SymlinkData
  *Boolean.*  Default:False.  If true then the HDF5 source file will not be copied but only symlinked. Note that if your HDF5 doesn’t have small enough chunking (max few MB per chunk) then performance will suffer. The default of False copies and rechunks the HDF5.

ShowInGenomeBrowser
  *Block.* If this key is present, the data will be visualised as a channel in the genome browser.
  This requires that data table used as ``ColumnDataTable`` is defined as "IsPositionOnGenome" (see :ref:`def-settings-datatable`)
  This key contains the following subkeys, Either 'Call' or 'AlleleDepth' or both must be present.
  The block can contain the following keys:
    Call
      *PropertyID.* Reference to the 2D data table property that contains call information.

    AlleleDepth
      *PropertyID.* Reference to the 2D data table property that contains depth information.

    ExtraProperties
      *PropertyIDList.* A list of the extra 2D data table properties that are displayed in the genotype channel. This will populate options for alpha and height control.


GenomeMaxViewportSizeX
  *Value.* Maximum size of the genome browser viewport (in bp) for which genotype calls will be displayed.

Properties
  *List (required).* Contains a list of all properties defined for each cell of the 2D data table.
  The block can contain the following keys:
    Id
      *Text (required).* Identifier of the property, and name of the dataset in the HDF5 source file.

    Name
      *Text.* Display name of the property.

    Description
      *Text.* Short description of this property.

    MinVal
      *Value.* For continuous properties the lower level at which values will be clipped on display.

    MaxVal
      *Value.* For continuous properties the upper level at which values will be clipped on display.



