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

nameSingle
  *Text (required).* Display name referring to data of an individual cell (single, without starting capital).

namePlural
  *Text (required).* Display name referring to data of several cells (plural, without starting capital).

description
  *Text.*  Default:.  A short description of this 2D data table.
  Note: this text may contain documentation links (see :ref:`def-source-docs`).

columnDataTable
  *Text (required).* Identifier of the (1D) data table defining the columns of the matrix
  (In case of genotype data: the variants). This links the 2D data table to the 1D data table containing the column information.

columnIndexField
  *Text (required).* The property ID in the ``columnDataTable`` data table that maps into the ``columnIndexArray``
  array in the zarr source dir. ``columnIndexField`` and ``columnIndexArray`` together establish the link between the column data table values, and the data present in the zarr source dir.
  Alternatively ``columnIndexArray`` can be omitted implying that the columns in zarr are in the same order as ``columnIndexField`` sorted.
  Note that "AutoKey" can be used if your rows do not have Unique IDs.

columnIndexArray
  *Text.* 1D Array in the zarr source dir that gives the value of ``columnIndexField`` for each column.
  If this is omitted then it is assumed that the zarr columns are in the same
  order as the ``columnDataTable`` data table, sorted by the ``columnIndexField`` property.

rowDataTable
  *Text (required).* Identifier of the (1D) data table defining the rows of the matrix
  (in case of genotype data: the samples). This links the 2D data table to the 1D data table containing the row information.

rowIndexField
  *Text (required).* The property ID in the ``rowDataTable`` data table that maps into ``rowIndexArray``
  array in the zarr source dir. ``rowIndexField`` and ``rowIndexArray`` together establish the link between the row data table values, and the data present in the zarr source dir.
  Alternatively ``rowIndexArray`` can be omitted implying that the rows in zarr are in the same order as ``rowIndexField`` sorted.
  Note that "AutoKey" can be used if your rows do not have Unique IDs.

rowIndexArray
  *Text.* 1D Array in the zarr source dir that gives the value of ``rowIndexField`` for each row.
  If this is omitted then it is assumed that the zarr columns are in the same
  order as the ``rowDataTable`` data table, sorted by the ``rowIndexField property``.

showInGenomeBrowser
  *Block.* If this key is present, the data will be visualised as a channel in the genome browser.
  This requires that data table used as ``columnDataTable`` is defined as "IsPositionOnGenome" (see :ref:`def-settings-datatable`)
  This key contains the following subkeys, Either 'Call' or 'AlleleDepth' or both must be present.
  The block can contain the following keys:
    call
      *PropertyID (required).* Reference to the 2D data table property that contains call information.

    alleleDepth
      *PropertyID.* Reference to the 2D data table property that contains depth information.

    extraProperties
      *PropertyIDList.* A list of the extra 2D data table properties that are displayed in the genotype channel. This will populate options for alpha and height control.


properties
  *List (required).* Contains a list of all properties defined for each cell of the 2D data table.
  The block can contain the following keys:
    id
      *Text (required).* Identifier of the property, and name of the dataset in the zarr source dir.

    name
      *Text.* Display name of the property.

    description
      *Text.* Short description of this property.

    minVal
      *Value.* For continuous properties the lower level at which values will be clipped on display.

    maxVal
      *Value.* For continuous properties the upper level at which values will be clipped on display.



