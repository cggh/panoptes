
.. _dataconcept_twoddatatable:

2D data table
.............

A *2D data table* is a matrix of data that combines two (1D) :ref:`data tables<dataconcept_datatable>`,
and provides information for each combination of elements from both tables. One data table serves as the definition of the rows,
the other as the definition of the columns of the matrix.
Several properties can be defined for each cell. These properties can be thought of as layers of the matrix in a third dimension.

The typical use case is *genotype data*, information about the genomic variations found on a set of genomic sequences (called *samples*), over a set of *variants*.
Both the *samples* and the *variants* have to be present in the dataset as :ref:`data tables<dataconcept_datatable>`, with the *2D data table*
containing the genotypes linked to them by the RowDataTable and ColumnDataTable.
The *variants* data table should be defined as containing genomic positions (see also  :ref:`def-settings-datatable`).

The *genotype data* is visualised on the genome browser, with the *samples* as rows,
and the *variants* as columns displayed at the corresponding genomic positions.
A number of properties can be stored and visualised for each genotype, such as call, quality, and coverage.
