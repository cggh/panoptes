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
cd build/dependencies/DQXServer
rm -rf cache
source bin/activate
echo -e "${green}Serving PANOPTES on http://localhost:8000/static/main.html${NC}"
bin/gunicorn -p ${PROJECT_ROOT}/scripts/gunicorn.pid -w 20 --access-logfile /dev/null --error-logfile - --log-level warning wsgi_static:application
