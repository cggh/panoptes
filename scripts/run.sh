#!/bin/bash -e
red='\e[0;31m'
green='\e[0;32m'
NC='\e[0m' # No Color
#Find out where this script is
SCRIPT_PATH="${BASH_SOURCE[0]}";
if ([ -h "${SCRIPT_PATH}" ]) then
  while([ -h "${SCRIPT_PATH}" ]) do SCRIPT_PATH=`readlink "${SCRIPT_PATH}"`; done
fi
pushd . > /dev/null
cd `dirname ${SCRIPT_PATH}`
#We are now at the dir of the script go one up to project
cd ..
PROJECT_ROOT=`pwd`;
BASEDIR=`python -c "import config;print(config.BASEDIR)"`
monetdbd start $BASEDIR/monetdb || true  #Fails if already started

source panoptes_virtualenv/bin/activate
cd server
if [ -z "$1" ]; then
    echo "No address specified - using localhost:8000"
    BIND="localhost:8000"
else
	BIND=${1}
fi  
if [ -z "$2" ]; then
    NUM_WORKERS=10
else
	NUM_WORKERS=${2}
fi
echo -e "${green}Serving PANOPTES on http://${BIND}/${NC}"
PYTHONPATH=`pwd`:`pwd`/.. ../panoptes_virtualenv/bin/gunicorn -b ${BIND} -p ${PROJECT_ROOT}/scripts/gunicorn.pid --timeout 120 -w ${NUM_WORKERS} --access-logfile /dev/null --error-logfile - --log-level warning wsgi_server:application
