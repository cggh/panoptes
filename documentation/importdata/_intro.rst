Loading data
============

Panoptes imports datasets into the server database from source data, consisting in a set of simple, structured files present on the server.
Importing a dataset from source data does not happen automatically, and has to be initiated by the user (see :doc:`importaction`).
This import action creates all necessary components to serve the dataset in Panoptes (relational database, preprocessed files, etc...)


See also:

.. toctree::
   :maxdepth: 1

   dataconcepts/_intro
   importaction

New source data can be added following two approaches:

Editing the source directory structure
--------------------------------------

The source data directory structure on the server can be directly manipulated:
adding new directories, copying data files and setting files, etc...
These source data files are located in the directory ``[SOURCEDATADIR]/datasets``
(``[SOURCEDATADIR]`` as specified in ``config.py``, see `config.py.sample <https://github.com/cggh/panoptes/blob/master/config.py.sample#L15>`_).

.. Note::
  This is a more low-level approach, which works best for large data sets and experienced data administrators.

See also:

.. toctree::
   :maxdepth: 1

   sourcefilesstructure/_intro


Using the Panoptes admin web frontend
-------------------------------------

Panoptes has an **admin** web frontend that can be used to manipulate the source data. This admin section can be opened in several ways:

- From the Panoptes web app, when the startup menu is show with a choice of datasets: click on *"Open admin page"*.
- From a Panoptes dataset session: click on the Panoptes logo in the top left corner, and then on *"Open admin page"* in the popup.

.. Note::
   The user must have sufficient privileges in order to have access to this admin section (see also :ref:`authorization`).

See also:

.. toctree::
   :maxdepth: 1

   adddataset
   adddatatable
   addworkspace
   addcustomdata
   addannotation
   addrefgenome
   importsettings/_intro
   identifiers

