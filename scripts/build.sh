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
#Have to do numpy first as h5py does not stipulate it as an install requirement....
pip install -q numpy
pip install -q -r $PROJECT_ROOT/servermodule/REQUIREMENTS
pip install -q gunicorn #For testing, not a strict requirement of DQXServer

echo -e "${red}  Linking DQX${NC}"
cd $PROJECT_ROOT
rm -rf webapp/scripts/DQX
cd webapp/scripts
ln -s $PROJECT_ROOT/build/DQX DQX

echo -e "${red}  Linking custom responders into DQXServer${NC}"
cd $PROJECT_ROOT
mkdir -p build/DQXServer/customresponders
touch build/DQXServer/customresponders/__init__.py
cd build/DQXServer/customresponders
ln -s $PROJECT_ROOT/servermodule/* .

echo -e "${red}  Linking static content into DQXServer${NC}"
cd $PROJECT_ROOT/build/DQXServer
ln -s $PROJECT_ROOT/webapp static

echo -e "${red}  Creating skeleton DB - if needed${NC}"
DBSRV=`python -c "import config;print config.DBSRV"`
DBUSER=`python -c "import config;print config.DBUSER"`
DBPASS=`python -c "import config;print config.DBPASS"`
DB=`python -c "import config;print config.DB"`
mysql -h$DBSRV -u$DBUSER -p$DBPASS <<- EOF
CREATE DATABASE IF NOT EXISTS ${DB};
USE ${DB};
CREATE TABLE IF NOT EXISTS datasetindex  (
   id  varchar(20) DEFAULT NULL,
   name  varchar(50) DEFAULT NULL
);
EOF


echo -e "${green}Done!${NC}"

#if [ -z "$WSGI_FOLDER" ]; then
#	echo "WSGI_FOLDER not set, you need to manually serve dependencies/DQXServer/app.wsgi"
#else
#	echo "Symlinking DQX server at $WSGI_FOLDER/panoptes/$CONFIG"
#	mkdir -p $WSGI_FOLDER/panoptes/$CONFIG
#	rm -rf $WSGI_FOLDER/panoptes/$CONFIG/*
#	ln -s $PROJECT_ROOT/dependencies/DQXServer/* $WSGI_FOLDER/panoptes/$CONFIG/.
#fi
#wget https://github.com/n1k0/casperjs/zipball/1.1-beta3
#unzip 1.1-beta3
#wget https://phantomjs.googlecode.com/files/phantomjs-1.9.2-linux-x86_64.tar.bz2
#tar xjvf phantomjs-1.9.2-linux-x86_64.tar.bz2

popd  > /dev/null

