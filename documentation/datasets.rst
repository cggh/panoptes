Datasets
=============================
Importing datasets
------------------
Panoptes imports datasets into the server database from source data, consisting in a set of simple, structured files.
These source data files are located in ``SOURCEDATADIR/datasets`` (as specified in ``config.py``). 
Importing a dataset source does not happen automatically, and has to be initiated by the user.

After installation, a number of sample dataset sources are copied into the source data folder, and are ready to be imported.

- Start the Panoptes app in a browser.
- In the intro screen, click on the hyperlink "Open admin page". This creates a new tab in the browser, showing the administration section of the app.
- The administration section shows the available source data file sets as a tree. Click on a dataset name you want to import (e.g. "Samples_and_Variants").
- Click the button "Import highlighted file source", and click "Load all data" in the popup that appears.
- This initiates the data import. A progress box is shown during this action.
- Upon completion, a new item appears in the list "Server calculations". Clicking on this shows a log of the import activities. If an error occurred, this can be useful for troubleshooting.
- Go back to the browser tab with the Panoptes intro screen, and reload the app by clicking the browser refresh button to retrieve the updated dataset information.
- The imported dataset should appear in the list.

Panoptes data structure
-----------------------
Basic concepts
~~~~~~~~~~~~~~
The data served by Panoptes is structured according to a number of central concepts.

Dataset
.......
A complete set of data that can be loaded and visualized in a single Panoptes session.
A dataset can consist of:

- A set of *data tables*.
- A *reference genome*, including annotation.
- A set of *summary values*, defined on the reference genome.
- *Genotype data*.

Workspace
.........
Each *dataset* has one or more *workspaces* associated. The user always opens a specific *workspace*, 
and can add custom information to the *dataset* that is only visible in the context of this *workspace*.
In addition, certain entities, such as stored queries, are specific to an individual *workspace*.

Data table
..........
A *data table* is a table of records that can be queried and visualized in Panoptes, and corresponds
to a type of information. Examples of *data tables* are **samples** and **genomic variants**.
A record in a *data table* is called a *data item*. Each *data table* has a number of columns
called *properties*.

Data item
.........
A *data item* is an individual record in a *data table*. For example, it may correspond to a single sample,
or a single variant.

Property
........
A *property* is a column in a *data table*. As such, it defines a property of a *data item*. Examples are collection dates and geographical coordinates for samples.
There are two types of properties:

- **Standard property**: provided in the *dataset*. These are visible in every *workspace*.
- **Custom property**: specified at the level of a *workspace*.

Reference genome
................
A *dataset* can have information that relates to a *reference genome*, such a genomic variants.
In Panoptes, the reference genome can be defined using a *reference sequence* and an *annotation*.

Summary value
.............
A *summary value* is a filterbanked property defined over a reference genome. There are three types:

- **Standard summary value**: provided in the *dataset*.
- **Custom summary value**: specified at the level of a *workspace*.
- **Data table - related summary value**: a type of *summary value* that has an instance for each *data item* in a *data table*. Example: sequencing coverage info for samples with sequenced genomes.
  
Genotype data
.............
@@TODO.
  

Source files structure
----------------------
Internally, Panoptes uses a combination of a set of MySQL databases and a file structure to serve the data. Data are loaded into this system be launching an **import action** that reads the data from a **source file location** (specified by ``SOURCEDATADIR`` in ``config.py``).

The formatting of the source data relies a few concepts:

- It is organised in a way that closely mimicks the basic concepts of the Panoptes data structures, using nested folders to reflect the structure.
- In most cases, data are provided using simple, TAB-delimited files. Exceptions are made in those cases where a widely accepted standard format is used for a specific type of information (e.g. GFF files for genome annotations).
- YAML (http://www.yaml.org/about.html) structured files are used to provide the necessary metadata to interpret and parse the data in the context of Panoptes. These metadata are provided in files called ``settings``.

.. caution::
  Identifiers used in the source data structures (folder names, table column headers, etc..), are directly mapped to identifiers in the MySQL database tables. Therefore, they should be formatted as standard variable names (e.g. do not contain dashes, white spaces or other special characters, do not start with a number, ...)
  
.. Note:: 
  This documentation does not describe all the directives that can be specified in the yaml settings files. The sample dataset **Samples_and_Variants** contains settings files that are fully commented, and can serve as a starting point to explore the possibe options. Additional comments are provided in other datasets as well, wherever concepts are introduced that are not present in this dataset.

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
