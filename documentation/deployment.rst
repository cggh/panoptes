Installation and deployment guide
=================================

Dependencies
------------
Panoptes needs a running MYSQL with permission to create and remove databases. 
Note that if there are tables from other apps that name-collide with Panoptes dataset names then there will be data loss.
USE A SEPERATE MYSQL INSTALL OR SET YOUR MYSQL PERMISSIONS CAREFULLY!
You will need to install the following packages (or equivalent) before Panoptes can be installed. E.g. for debian-based machines::

	apt-get install gcc gfortran python-dev libblas-dev liblapack-dev cython libmysqlclient-dev libhdf5-dev


Build
-----
Copy 'config.py.example' to 'config.py'. Edit the file for your MYSQL setup and specify a directory Panoptes can use for storing files.
Note that changes in 'config.py' are only used on build, so you will need to rebuild if they change.

To build run::

	./scripts/build.sh

to create a panoptes installation in 'build'. Note that this deletes any existing build.
This will attempt to install the needed python packages and link Panoptes into the DQXServer framework which serves the app.

Simple Server
-------------
The simplest way to run Panoptes is using::

	./scripts/run.sh

by default, this serves Panoptes on http://localhost:8000 using gunicorn. 
To run on your external network interface use (with the port you desire)::

	./scripts/run 0.0.0.0:8000

Note that you will need internet access even if you run Panoptes locally due to google-hosted mapping tools.

Deployment
----------
@@TODO instructions for deploying a new instance of panoptes on a web
server such as apache or nginx

