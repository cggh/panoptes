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

#Start a server
./scripts/run.sh &
sleep 1

cd ${PROJECT_ROOT}/tests
casperjs test simple.js

PID=`cat ${PROJECT_ROOT}/scripts/gunicorn.pid`
kill ${PID}
while kill -0 "${PID}" > /dev/null 2>&1; do
            sleep 0.5
done

