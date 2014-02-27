
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
