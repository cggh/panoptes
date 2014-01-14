#!/bin/bash -e
#Find out where this script is
red='\e[0;31m'
green='\e[0;32m'
NC='\e[0m' # No Color
SCRIPT_PATH="${BASH_SOURCE[0]}";
if ([ -h "${SCRIPT_PATH}" ]) then
  while([ -h "${SCRIPT_PATH}" ]) do SCRIPT_PATH=`readlink "${SCRIPT_PATH}"`; done
fi
pushd . > /dev/null
cd `dirname ${SCRIPT_PATH}` > /dev/null
#We are now at the dir of the script go one up to project
cd ..
PROJECT_ROOT=`pwd`;

if [ -z "$CONFIG" ]; then
    CONFIG=default
fi

echo -e "${red}Building PANOPTES....${NC}"
cd $PROJECT_ROOT
mkdir -p webapp/scripts/Local
cp -rf webapp/scripts/Local.example/* webapp/scripts/Local/.
rm -rf build
mkdir -p build
cd build

echo -e "${red}  Fetching dependancies${NC}"
cd $PROJECT_ROOT/build
rm -rf dependencies
mkdir -p dependencies
cd dependencies
echo -e "${red}    DQX${NC}"
git clone git@github.com:malariagen/DQX.git
cd DQX
git checkout `cat $PROJECT_ROOT/dependencies/DQX_Version`
cd ..

echo -e "${red}    DQXServer${NC}"
git clone git@github.com:malariagen/DQXServer.git
cd DQXServer
git checkout `cat $PROJECT_ROOT/dependencies/DQXServer_Version`
cp $PROJECT_ROOT/config.py config.py
echo pythoncommand = \'`which python`\' >> config.py
echo mysqlcommand = \'`which mysql`\' >> config.py

echo -e "${red}    Python dependancies${NC}"
cd .. 
virtualenv DQXServer
cd DQXServer
source bin/activate
pip install -q -r REQUIREMENTS
#Extra ones for custom responder
pip install -q -r $PROJECT_ROOT/servermodule/REQUIREMENTS
pip install -q gunicorn #For testing, not a strict requirement of DQXServer

echo -e "${red}  Linking DQX${NC}"
cd $PROJECT_ROOT
rm -rf webapp/scripts/DQX
cd webapp/scripts
ln -s $PROJECT_ROOT/build/dependencies/DQX DQX

echo -e "${red}  Linking custom responders into DQXServer${NC}"
cd $PROJECT_ROOT
mkdir -p build/dependencies/DQXServer/customresponders
touch build/dependencies/DQXServer/customresponders/__init__.py
cd build/dependencies/DQXServer/customresponders
ln -s $PROJECT_ROOT/servermodule/* .

echo -e "${red}  Linking static content into DQXServer${NC}"
cd $PROJECT_ROOT/build/dependencies/DQXServer
ln -s $PROJECT_ROOT/webapp static

echo -e "${green}Done!${NC}"

#if [ -z "$WSGI_FOLDER" ]; then
#	echo "WSGI_FOLDER not set, you need to manually serve dependencies/DQXServer/app.wsgi"
#else
#	echo "Symlinking DQX server at $WSGI_FOLDER/panoptes/$CONFIG"
#	mkdir -p $WSGI_FOLDER/panoptes/$CONFIG
#	rm -rf $WSGI_FOLDER/panoptes/$CONFIG/*
#	ln -s $PROJECT_ROOT/dependencies/DQXServer/* $WSGI_FOLDER/panoptes/$CONFIG/.
#fi
# sudo apt-get install gcc gfortran python-dev libblas-dev liblapack-dev cython
popd  > /dev/null

