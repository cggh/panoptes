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
git clone https://github.com/malariagen/DQX.git
cd DQX
git checkout `cat $PROJECT_ROOT/dependencies/DQX_Version`
cd ..

echo -e "${red}    DQXServer${NC}"
git clone https://github.com/malariagen/DQXServer.git
cd DQXServer
git checkout `cat $PROJECT_ROOT/dependencies/DQXServer_Version`

echo -e "${red}    Python dependancies${NC}"
cd .. 
virtualenv DQXServer
cd DQXServer
source bin/activate
echo -e "${red}      DQXServer requirements...${NC}"
pip install -q -r REQUIREMENTS
#Extra ones for custom responder
#Have to do numpy first as h5py does not stipulate it as an install requirement....
echo -e "${red}      NumPy...${NC}"
pip install -q numpy
echo -e "${red}      Panoptes requirements...${NC}"
pip install -q -r $PROJECT_ROOT/servermodule/REQUIREMENTS
echo -e "${red}      gunicorn...${NC}"
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

echo -e "${red}  Copying config.py${NC}"
cp $PROJECT_ROOT/config.py config.py
echo pythoncommand = \'`which python`\' >> config.py
echo mysqlcommand = \'`which mysql`\' >> config.py

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
CREATE TABLE IF NOT EXISTS calculations (
  id varchar(50) NOT NULL,
  user varchar(50) DEFAULT NULL,
  timestamp varchar(50) DEFAULT NULL,
  name varchar(300) DEFAULT NULL,
  status varchar(300) DEFAULT NULL,
  progress float DEFAULT NULL,
  completed int(11) DEFAULT NULL,
  failed int(11) DEFAULT NULL,
  scope varchar(100) DEFAULT NULL,
  PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS storedviews (
  dataset varchar(100) DEFAULT NULL,
  workspace varchar(100) DEFAULT NULL,
  id varchar(100) DEFAULT NULL,
  settings varchar(10000) DEFAULT NULL
);
CREATE TABLE IF NOT EXISTS storage (
  id varchar(50) DEFAULT NULL,
  content text,
  UNIQUE KEY storage_id (id)
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

