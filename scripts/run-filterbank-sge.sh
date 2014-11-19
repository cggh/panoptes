#!/bin/bash
#Find out the available parallel environments using the command `qconf -spl`
QUEUE_NAME=mpi_pe
NUMPROCS=14
SCRIPT=build/DQXServer/customresponders/panoptesserver/importer/ProcessFilterBank.py
DATASET=Samples_and_Variants
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

qsub -cwd -pe ${QUEUE_NAME} ${NUMPROCS} -b y `which mpirun` -x PYTHONPATH=${PROJECT_ROOT}/build/DQXServer ${PY} ${SCRIPT} all files ${DATASET} mpi

#If you get the message "Host key verification failed." then make sure you can ssh to the fully qualified hostname of all the relevant hosts in the queue
#The .ssh/known_hosts file needs to contain all the hosts
#Alternatively http://arc.liv.ac.uk/SGE/howto/hostbased-ssh.html

#Example parallel environment
#qconf -mp mpi_pe
#pe_name            mpi_pe
#slots              8
#user_lists         NONE
#xuser_lists        NONE
#start_proc_args    /bin/true
#stop_proc_args     /bin/true
#allocation_rule    $fill_up
#control_slaves     TRUE
#job_is_first_task  FALSE
#urgency_slots      min
#accounting_summary FALSE

#Command to modify queue
#qconf -mq mpi.q
