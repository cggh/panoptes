
.. _dataconcept_genotype:

Genotype data
.............
*Genotype data* is information about the genomic variations found on a set of genomic sequences (called *samples*) a set of *variants*.
Both the *samples* and the *variants* have to be present in the dataset as :ref:`data tables<dataconcept_datatable>`.
The *variants* data table should be defined as genomic positions.

The *genotype data* is visualised on the genome browser, with the *samples* as rows,
and the *variants* as columns on the corresponding genomic positions.
A number of properties can be stored and visualised for each genotype, such as call, quality, and coverage.
