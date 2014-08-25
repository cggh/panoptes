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

.. _def-source-dataset:

Dataset
~~~~~~~~
The ``config.SOURCEDATADIR`` folder should contain a folder ``datasets``, serving as a root for all *datasets* being served by the Panoptes instance.

In this folder, a subfolder should be present for each *dataset*. The folder name is used as the unique identifier of this dataset.
In the *dataset* folder, a yaml ``settings`` file should be present, specifying the displayed name of the dataset, and an optional description (see :ref:`def-settings-dataset`).


.. _def-source-referencegenome:

Reference genome
~~~~~~~~~~~~~~~~
A *dataset* source data folder may optionally contain a subfolder ``refgenome``, describing the reference genome used. It can contain the following files:

- ``chromosomes`` (required). A list of all chromosomes identifiers, and their lengths (in MB).
- ``annotation.gff`` (required). The annotation of the reference genome, in GFF format.
- ``refsequence.fa`` (optional). The reference genome sequence, as FASTA file.
- ``settings`` (required, yaml formatted). Various settings concerning the reference genome (see :ref:`def-settings-refgenome`).

Summary values
~~~~~~~~~~~~~~
The ``refgenome`` folder may contain an optional subfolder ``summaryvalues``. Each subfolder in this folder represents a different (numerical) property defined over the genome that will be filter banked and can be displayed in the genome browser. The folder name serves as the identifier of the summary value. Each summary value folder should contain the following two files:

- ``values``. A TAB-delimited file having three columns (and no header):

   - column 1: Chromosome identifier
   - column 2: Position
   - column 3: Value

- ``settings`` (yaml formatted). Contains the displayed name of the summary value, and further guidelines on how to process the information.


.. _def-source-datatable:


Data table
~~~~~~~~~~~
In the *dataset* folder, a subfolder ``datatables`` should be present. This is the root for a set of folders, each one describing an individual *data table*, with the name of the folder serves as an identifier.

In a *data table* folder, a file ``data`` should be present, containing a list of all the *data items* in the table. Each line consists in a set of TAB-delimited *properties*. The first line of the file serves as a header, specifying the identifiers for all *properties*.

In addition, a yaml ``settings`` file should be present in the *datatable* folder.
This file can contain a number of settings, both at the level of the *data table*, as at the level of individual *properties* (see :ref:`def-settings-datatable`).


.. _def-source-workspace:

Workspace
~~~~~~~~~~
In the *dataset* folder, a subfolder ``workspaces`` should be present. This is the root for a set of subfolders, each one describing a *workspace* for this *dataset*. The folder name serves as identifier for the *workspace*.

In a *workspace* folder, a yaml structured ``settings`` file should be present, specifying the displayed name of the workspace (see :ref:`def-settings-workspace`).

In addition, a subfolder ``customdata`` should be present. This location is used to specify *Custom data*, which has the following basic properties:

- It only exists in the context of a specific *workspace*.
- It adds extra properties to a *data table* that already exists in the *dataset*.
- The primary key of the *data table* (as defined in the settings) is used to link the custom properties to the original table.

.. _def-source-customdata:

Custom data
~~~~~~~~~~~

The ``customdata`` folder in a workspace should have a subfolder for each *data table* it defines date for, and the folder name should be the *data table* identifier. In this data table - specific folder, a number of subfolder can be defined, each one specifying an individual set of *custom data*. Such a subfolder should contain two files:

- ``data``. TAB-delimited file containing the custom property values.
- ``settings``. (yaml formatted). Specifies how the custom data should be interpreted (see :ref:`def-settings-customdata`).
