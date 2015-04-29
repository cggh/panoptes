# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

TITLE = 'Panoptes'

###########################################################################################################
# Configuration parameters for connecting to the MySQL database
###########################################################################################################

# Machine name where the database is running
DBSRV = 'localhost'

# Login name used to gain access
DBUSER = 'root'

# Password used to gain access
DBPASS = '1234'

# Default database name (e.g. used to store certain settings)
DB='datasetindex'

# Command to invoke the MySQL prompt
mysqlcommand = 'mysql'

# Command to invoke python
pythoncommand = 'python'

# Timeout for server query
TIMEOUT = 60

###########################################################################################################
# Server side file structure location
#########################################################################################################
# Root directory of the server side file structure
BASEDIR = '/panoptes/basedir'

SOURCEDATADIR = '/panoptes/sourcedata'


CAS_SERVICE = ''
CAS_VERSION = 3
CAS_LOGOUT_PAGE = '/logout'
CAS_LOGOUT_DESTINATION = ''
CAS_FAILURE_PAGE = None
