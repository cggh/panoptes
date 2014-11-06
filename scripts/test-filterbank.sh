#!/bin/bash
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

if [ 1 = 1 ]
then
source build/virtualenv/bin/activate
PYTHONPATH=${PROJECT_ROOT}/build/DQXServer
export PYTHONPATH

cd build/DQXServer/customresponders/panoptesserver/importer

python ProcessFilterBank.py all files Samples_and_Variants

fi
