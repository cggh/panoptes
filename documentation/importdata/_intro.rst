Importing data
==============

Panoptes imports datasets into the server database from source data, consisting in a set of simple, structured files.
These source data files are located in the directory ``[SOURCEDATADIR]/datasets``
(``[SOURCEDATADIR]`` as specified in ``config.py``, see `config.py.sample <https://github.com/cggh/DQXServer/blob/master/config.py.sample#L38>`_).
Importing a dataset from source data does not happen automatically, and has to be initiated by the user.

.. toctree::
   :maxdepth: 1

   datastructure
   importaction
   sourcefilesstructure
   importsettings/_intro
