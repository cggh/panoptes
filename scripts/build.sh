#!/bin/bash -e
#Find out where this script is
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

if [ -z "$DBHOST" ] || [ -z "$DBUSER" ] || [ -z "$DBPASS" ] ; then
	echo \$DBHOST, \$DBUSER, \$DBPASS, all need to be set
	exit 1
fi


echo "Building PANOPTES with configuration: $CONFIG"
cd $PROJECT_ROOT
mkdir -p webapp/scripts/Local
cp -rf webapp/scripts/Local.example/* webapp/scripts/Local/.
rm -rf build
mkdir -p build
cd build

echo "Fetching dependancies"
cd $PROJECT_ROOT/build
rm -rf dependencies
mkdir -p dependencies
cd dependencies
git clone git@github.com:malariagen/DQX.git
cd DQX
git checkout `cat $PROJECT_ROOT/dependencies/DQX_Version`
cd ..

git clone git@github.com:malariagen/DQXServer.git
virtualenv DQXServer
cd DQXServer
git checkout `cat $PROJECT_ROOT/dependencies/DQXServer_Version`
echo "Installing python dependancies"
source bin/activate
pip install -q -r REQUIREMENTS
#Extra ones for custom responder
pip install -q -r $PROJECT_ROOT/servermodule/REQUIREMENTS
pip install -q gunicorn #For testing, not a strict requirement of DQXServer

echo "Linking DQX"
cd $PROJECT_ROOT
rm -rf webapp/scripts/DQX
cd webapp/scripts
ln -s $PROJECT_ROOT/build/dependencies/DQX DQX

echo "Linking custom responders into DQXServer"
cd $PROJECT_ROOT
mkdir -p build/dependencies/DQXServer/customresponders
touch build/dependencies/DQXServer/customresponders/__init__.py
cd build/dependencies/DQXServer/customresponders
ln -s $PROJECT_ROOT/servermodule/* .

echo "Grabbing Pauls Table Util files (HACKY!)"
cd $PROJECT_ROOT/build/dependencies/DQXServer/customresponders/uploadtracks
wget -nv https://raw.github.com/pvaut/MiscPythonUtils/master/Src/TableUtils/VTTable.py
cd $PROJECT_ROOT/build/dependencies/DQXServer/Convertors
wget -nv https://raw.github.com/pvaut/MiscPythonUtils/master/Src/TableUtils/IntervalTools.py
wget -nv https://raw.github.com/pvaut/MiscPythonUtils/master/Src/TableUtils/VTTable.py

echo "Linking static content into DQXServer"
cd $PROJECT_ROOT/build/dependencies/DQXServer
ln -s $PROJECT_ROOT/webapp static

echo "Running data-load for config $CONFIG"
cd $PROJECT_ROOT/configs/$CONFIG
bash -e load.sh

#if [ -z "$WSGI_FOLDER" ]; then
#	echo "WSGI_FOLDER not set, you need to manually serve dependencies/DQXServer/app.wsgi"
#else
#	echo "Symlinking DQX server at $WSGI_FOLDER/panoptes/$CONFIG"
#	mkdir -p $WSGI_FOLDER/panoptes/$CONFIG
#	rm -rf $WSGI_FOLDER/panoptes/$CONFIG/*
#	ln -s $PROJECT_ROOT/dependencies/DQXServer/* $WSGI_FOLDER/panoptes/$CONFIG/.
#fi

popd  > /dev/null

