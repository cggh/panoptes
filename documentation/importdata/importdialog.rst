
.. _importdialog:

Import dialog box
-----------------
The "Import file source data" dialog box is used to initiate import of a dataset, interpreting the source data (see :ref:`def-source-data`),
and creating the environment required for serving the dataset in Panoptes. This includes:

- Create the relational database containing tables for all data tables.
- Transform all necessary files such as GFF annotation data.
- If applicable, execute all filterbanking actions on genomic data.
- If applicable, transform genotyping data into a format suitable for serving.

In this dialog, one of the import types has to be chosen prior to activating the import:

Full import:
  This option executes a full import from scratch of the complete source data for the selected component.
  If an entire dataset is imported, the relational database used for serving will be dropped and rebuilt.
  Note that, for large datasets, this may take a long time to complete.

Update configuration only:
  This option does not import any data at all, but can be used to quickly update the settings on the served dataset,
  based on changes in the definitions in the source data settings files (e.g. descriptive texts, colours, etc...).

  - **NOTE:** this option can only be used when a dataset was already imported earlier using the "Full import" or "Top X preview" option.
  - **NOTE:** some setting changes (e.g. filterbanking definitions) do require an actual data import.

Top 1K, 10K, ... preview:
  This option executes a full import of a portion of the source data for the selected component.
  If an entire dataset is imported, the relational database used for serving will be dropped and rebuilt.
  Use this option to test run import of a large dataset on a subset of the source data.
  In this way, a much quicker turnaround can be achieved when debugging and tweaking the settings files.
  **NOTE:** if a top X import action is performed on a dataset where a full import was already executed earlier,
  the data not present in the top subset will be removed from the running dataset.

After selecting the appropriate import type, click the "Import" button to activate the import.