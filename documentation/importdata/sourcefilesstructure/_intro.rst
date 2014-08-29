.. _def-source-data:

Source files structure
----------------------
Internally, Panoptes uses a combination of a set of MySQL databases and a file structure to serve the data. Data are loaded into this system be launching an **import action** that reads the data from a **source file location** (specified by ``SOURCEDATADIR`` in ``config.py``).

The formatting of the source data relies a few concepts:

- It is organised in a way that closely mimicks the basic concepts of the Panoptes data structures, using nested folders to reflect the structure.
- In most cases, data are provided using simple, TAB-delimited files. Exceptions are made in those cases where a widely accepted standard format is used for a specific type of information (e.g. GFF files for genome annotations).
- YAML (http://www.yaml.org/about.html) structured files are used to provide the necessary metadata to interpret and parse the data in the context of Panoptes. These metadata are provided in files called ``settings``.

.. caution::
  Many identifiers used in the source data structures (folder names, table column headers, etc..), are directly mapped to identifiers in the MySQL database tables. Therefore, they should be formatted as standard variable names (e.g. do not contain dashes, white spaces or other special characters, do not start with a number, ...)

.. toctree::
   :maxdepth: 1

   dataset
   refgenome
   datatable
   workspace
   customdata





