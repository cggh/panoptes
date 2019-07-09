Installation and deployment guide
=================================

Basic installation
------------------

Download & dependencies
.......................
Download the code from the GitHub repository::

    wget https://github.com/cggh/panoptes/archive/master.zip
    unzip master.zip
    cd panoptes-master

Panoptes uses MonetDB (https://www.monetdb.org) which is best installed from their repository. See instructions at https://www.monetdb.org/downloads For ubuntu this is::

    sudo apt-add-repository "deb http://dev.monetdb.org/downloads/deb/ xenial monetdb"
    wget --output-document=- https://www.monetdb.org/downloads/MonetDB-GPG-KEY | sudo apt-key add -
    sudo apt-get update
    sudo apt-get install -y --allow-unauthenticated monetdb5-sql monetdb-client

You will need to install the following packages (or equivalent) before Panoptes can be installed. E.g. for debian-based Linuxes::

    sudo apt-get install git gcc gfortran python-dev virtualenv libblas-dev liblapack-dev cython libhdf5-serial-dev


Build
.....
In the directory where the code was unzipped, copy 'config.py.example' to 'config.py'.
Edit the file and specify the following components:

- A directory Panoptes can use for storing files (BASEDIR, see further).
- A directory that will contain the source data files (SOURCEDATADIR, see further)
- Title of the deployment (TITLE)
- Extra JS for utilities and tracking such as rollbar etc. Note that google analytics can be set on a dataset level. (EXTRA_HEAD, EXTRA_TAIL)

.. note::
The login credentials used need to have sufficient privileges to perform alterations such as database creation.


To build run::

	./scripts/build.sh

to create a panoptes installation in 'build'. Note that this deletes any existing build.
This build copies the different components of the application, and merges them into a single file structure.
Note that, during this process, a copy of `config.py` is put in the build folder. This copy is used by the actual server process.
This will attempt to install the needed python packages.


Simple Server
.............
The simplest way to run Panoptes is using::

	./scripts/run.sh

by default, this serves Panoptes on http://localhost:8000/index.html using gunicorn.
To run on your external network interface use (with the port you desire)::

	./scripts/run.sh 0.0.0.0:8000

Note that you will need internet access even if you run Panoptes locally due to google-hosted mapping tools.


Deployment on a new Ubuntu image
--------------------------------

For testing purposes, a slightly easier way to obtain a running instance of Panoptes is to do a full deployment on a fresh a fresh Ubuntu 14.04.1 LTS image,
e.g. on an EC2 virtual machine.
A script is provided that performs a fully automatic installation, including

- Installation of all dependencies
- Deployment and configuration of Apache2

.. caution::
  This deployment option will aggressively override packages and settings on the machine. It is only intended to be used on a fresh image.

The following steps will create a fully working Panoptes instance on an Ubuntu 14.04.1 LTS image::

  cd /
  sudo wget https://raw.github.com/cggh/panoptes/master/scripts/deploy_default/deployfull.sh
  sudo chmod +x deployfull.sh
  sudo ./deployfull.sh

The source data folder is set to `/panoptes/sourcedata`. The application is accessible from `[ServerAddress]/index.html`.


Deployment on Apache2 (OPTIONAL)
................................

.. note::
  This section describes a deployment strategy where the static files (html, css, js)
  are also served through the WSGI interface. This allows one to protect the application using a CAS Single Sign-On service.
  
Install the Apache2 wsgi dependency `libapache2-mod-wsgi`.

Create a symbolic link in `/var/www/` to `[PanoptesInstallationPath]/server/wsgi_server.py`::

    ln -s [PanoptesInstallationPath]/server/wsgi_server.py /var/www/.

The build script uses a virtualenv for the installation of Python dependencies,
and the Apache2 WSGI configuration has to be instructed to use that virtualenv.
An example VirtualHost config would be (note that the tokens need to be replaced by their proper values)::

    <VirtualHost *:80>
        DocumentRoot /var/www
        <Directory />
            Options FollowSymLinks
            AllowOverride None
        </Directory>
        WSGIDaemonProcess Panoptes processes=2 threads=25 python-path=[PanoptesInstallationPath]/panoptes_virtualenv/lib/python2.7/site-packages:[PanoptesInstallationPath]:[PanoptesInstallationPath]/server
        WSGIProcessGroup Panoptes
        WSGIScriptAlias / /var/www/wsgi_server.py
    </VirtualHost>

In this configuration, the app is served from::

  [ServerName]:80/

