Installation and deployment guide
=================================

Dependencies
------------
Panoptes needs a running MySQL with permission to create and remove databases.

.. caution::
  Note that if there are tables from other apps that name-collide with Panoptes dataset names then there will be data loss.
  **Use a separate MySQL install or set your MySQL permissions carefully!**

You will need to install the following packages (or equivalent) before Panoptes can be installed. E.g. for debian-based machines::

	apt-get install gcc gfortran python-dev libblas-dev liblapack-dev cython libmysqlclient-dev

You will also need libhdf5-dev. This is a virtual package satisfied by the several different install types of HDF5. The simplest solution is to::

    apt-get install libhdf5-serial-dev

unless you want a specific HDF5 setup.

Build
-----
Copy 'config.py.example' to 'config.py'. Edit the file and specify the following components:
 - MySQL setup (DBSRV, DBUSER, DBPASS).
   By default, Panoptes uses the MySQL defaults file ``~/.my.cnf`` to obtain the login credentials.
   
     * Make sure that the account used to run the Panoptes server has the right MySQL configuration file in the home directory.
     * NOTE: the login credentials used need to have sufficient privileges to perform alterations such as database creation.
     
 - A directory Panoptes can use for storing files (BASEDIR, see further).
 - A directory that will contain the source data files (SOURCEDATADIR, see further)
Note that changes in 'config.py' are used on build, so you will need to rebuild if they change.


To build run::

	./scripts/build.sh

to create a panoptes installation in 'build'. Note that this deletes any existing build.
This will attempt to install the needed python packages and link Panoptes into the DQXServer framework which serves the app.

Server data file structure
--------------------------
Panoptes uses two file directories, and the location of both has to be specified in config.py.

BASEDIR:
This is the root directory for storing file-based server data. It should contain subdirectories "SummaryTracks" and "temp".
Both should have write privileges for the user that runs the service.

SOURCEDATADIR:
This directory contains the file-bases data sources that are used to import into the Panoptes datasets.

.. note:
  Both paths have to be specified as absolute, starting from /. Do not use relative paths here.

Simple Server
-------------
The simplest way to run Panoptes is using::

	./scripts/run.sh

by default, this serves Panoptes on http://localhost:8000/static/main.html using gunicorn.
To run on your external network interface use (with the port you desire)::

	./scripts/run.sh 0.0.0.0:8000

Note that you will need internet access even if you run Panoptes locally due to google-hosted mapping tools.
See section :doc:`datasets` for more information on how to populate the Panoptes instance with data.

Deployment
----------
@@TODO instructions for deploying a new instance of panoptes on a web
server such as apache or nginx


Authorization
-------------
Panoptes contains a simple authorization mechanism that can be used to grant or deny certain privileges on datasets.
There are three levels of privileges:
 - Read: View the data in a dataset.
 - Edit: Add custom data properties to a workspace.
 - Manage: All actions, including loading the dataset from the file source.
 
The authorization mechanism interacts with authentication systems implemented at the web server level,
by reading the REMOTE_USER environment variable (in case of CAS authentication, it can also use information in HTTP_CAS_MEMBEROF).

The file PanoptesAuthDb (https://raw2.github.com/malariagen/panoptes/master/servermodule/panoptesserver/PanoptesAuthDb)
is used to link user authentication information to privileges on specific datasets. The default installation grants all rights to everybody.
