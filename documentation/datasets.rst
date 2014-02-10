Datasets
=============================
.. _import-datasets:
Importing datasets
------------------
Panoptes imports datasets into the server database from source data, consisting in sets of simple, structured files. 
These source data files are located in SOURCEDATADIR/datasets (as specified in config.py). 
The structure of these source data files is described in more detail in `Source files structure`_.
Importing a dataset source does not happen automatically, and has to be initiated by the user.

After installation, a number of sample dataset sources are copied into the source data folder, and are ready to be imported.

- Start the Panoptes app in a browser.
- In the intro screen, click on the hyperlink "Admin tool". This creates a new tab in the browser,
  showing the administration section of the app.
- The administration section shows the available source data file sets as a tree. Click on a dataset name you want to import (e.g. "Sample1")
- Click the button "Load highlighted file source", and click "Load all data" in the popup that appears
- This initiates the data import. A progress box is shown during this action.
- Upon completion, a new item appears in the list "Server calculations". Clicking on this shows a log of the import activities.
  If an error occurred, this can be useful for troubleshooting.
- Go back to the browser tab with the Panoptes intro screen, and reload the app to retrieve the updated dataset information
- The imported dataset should appear in the list.

Panoptes data structure
-----------------------
Basic concepts
~~~~~~~~~~~
The data served by Panoptes is structured according to a number of central  concepts.

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
A *property* is a column in a *data table*. As such, it defines a property of a *data item*. Examples are collection date and geographical coordinates for samples.
There are two types of properties:

- **Standard property**: provided in the *dataset*. These are shared amongst every *workspace*.
- **Custom property**: specified at the level of a *workspace*.

Reference genome
................
A *dataset* can have information that relates to a *reference genome*, such a genomic variants.
In Panoptes, the reference genome can be defined using a *reference sequence* and an *annotation*.

Summary value
.............
A *summary value* is a filterbanked property defined over a reference genome. There are three types:

- **Standard summary value**: provided in the *dataset*.
- **Custom summary value**: specifie at the level of a *workspace*.
- **Data table - related summary value**: a type of *summary value* that has an instance for each *data item* in a *data table*. Example: sequencing coverage info for a data table containing samples with sequenced genomes.
  
Genotype data
.............
@@TODO.
  

Source files structure
----------------------
