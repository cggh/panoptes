Installation and deployment guide
=================================

Automated installation :doc:`automated_install`

(Semi) Manual installation :doc:`manual_install`

.. _server-data-structure:

Server data file structure
..........................
Panoptes uses two file directories, and the location of both has to be specified in config.py
(example: `config.py.sample <https://github.com/cggh/DQXServer/blob/master/config.py.sample#L38>`_).

BASEDIR:
This is the root directory for storing file-based server data. It should contain subdirectories "SummaryTracks", "Uploads" and "temp".
All should have write privileges for the user that runs the server.

SOURCEDATADIR:
This directory contains the file-bases data sources that are used to import into the Panoptes datasets.

.. note::
  Both paths have to be specified as absolute, starting from /. Do not use relative paths here.

See section :doc:`importdata/_intro` for more information on how to populate the Panoptes instance with data.


.. _authorization:

Authorization
-------------
Panoptes contains a simple authorization mechanism that can be used to grant or deny certain privileges on datasets.
There are three levels of privileges:

 - Read: View the data in a dataset.
 - Edit: Add custom data properties to a workspace.
 - Manage: All actions, including loading the dataset from the file source.
 
The authorization mechanism interacts with authentication systems implemented at the web server level,
by reading the REMOTE_USER environment variable.

Specifically, Panoptes can integrate with a CAS Single Sign-On service. To enable this, specify the CAS service
url in the `CAS_SERVICE` variable in `config.py`. In this case, authentication can also be based on user groups.

The file PanoptesAuthDb (https://raw2.github.com/cggh/panoptes/master/servermodule/panoptesserver/PanoptesAuthDb)
is used to link user authentication information to privileges on specific datasets.
The default installation grants all rights to everybody.
