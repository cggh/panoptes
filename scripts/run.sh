#!/bin/bash -e
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
source bin/activate
bin/gunicorn -p ${PROJECT_ROOT}/scripts/gunicorn.pid -w 4 wsgi_static:application

