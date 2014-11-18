#!/bin/bash
QUEUE_NAME=mpi_pe
NUMPROCS=8
SCRIPT=build/DQXServer/customresponders/panoptesserver/importer/ProcessFilterBank.py
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

source build/virtualenv/bin/activate
pip install mpi4py
PYTHONPATH=${PROJECT_ROOT}/build/DQXServer
export PYTHONPATH

PY=`which python`

qsub -cwd -pe ${QUEUE_NAME} ${NUMPROCS} -b y `which mpirun` -x PYTHONPATH=${PROJECT_ROOT}/build/DQXServer ${PY} ${SCRIPT} all files Samples_and_Variants mpi
