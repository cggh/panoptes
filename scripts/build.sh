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

if [ ! -f config.py ]
then
  echo "You must have a config.py"
  exit 1
fi

echo -e "${red}THIS BRANCH IS UNDERGOING LARGE REWRITES YOU SHOULD USE 1.6.2${NC}"
echo -e "${green}Building PANOPTES....${NC}"
cd $PROJECT_ROOT
#mkdir -p webapp/scripts/Local
#cp -rf webapp/scripts/Local.example/* webapp/scripts/Local/.
mkdir -p webapp/scripts
mkdir -p build
rm -rf build/DQX
rm -rf build/DQXServer
cd build

echo -e "${green}  Fetching dependancies${NC}"
cd $PROJECT_ROOT/build

echo -e "${green}    DQXServer${NC}"
if [ -z "$GITSSH" ]; then
    git clone https://github.com/cggh/DQXServer.git
else
    git clone git@github.com:cggh/DQXServer.git
fi
cd DQXServer
git checkout `cat $PROJECT_ROOT/dependencies/DQXServer_Version`

echo -e "${green}    Python dependancies${NC}"
cd ..
if [ ! -d panoptes_virtualenv ]
then
  virtualenv panoptes_virtualenv
fi
source panoptes_virtualenv/bin/activate
cd DQXServer
echo -e "${green}      DQXServer requirements...${NC}"
pip install -q -r REQUIREMENTS
#Extra ones for custom responder
#Have to do numpy first as h5py does not stipulate it as an install requirement....
echo -e "${green}      NumPy...${NC}"
pip install -q numpy
echo -e "${green}      Panoptes requirements...${NC}"
pip install -q -r $PROJECT_ROOT/servermodule/REQUIREMENTS
echo -e "${green}      gunicorn...${NC}"
pip install -q gunicorn==19.1.0 #For testing and instant run, not a strict requirement of DQXServer


echo -e "${green}  Linking custom responders into DQXServer${NC}"
cd $PROJECT_ROOT
mkdir -p build/DQXServer/customresponders
touch build/DQXServer/customresponders/__init__.py
cd build/DQXServer/customresponders
ln -s $PROJECT_ROOT/servermodule/* .

echo -e "${green}  Linking static content into DQXServer${NC}"
cd $PROJECT_ROOT/build/DQXServer
ln -s $PROJECT_ROOT/webapp/dist static

echo -e "${green}  Copying config.py${NC}"
cp $PROJECT_ROOT/config.py config.py
echo pythoncommand = \'`which python`\' >> config.py
echo mysqlcommand = \'`which mysql`\' >> config.py

BASEDIR=`python -c "import config;print config.BASEDIR"`
echo -e "${green}  Basedir is ${BASEDIR} - making if it doesn't exist"
mkdir -p $BASEDIR
mkdir -p $BASEDIR/temp
mkdir -p $BASEDIR/SummaryTracks
mkdir -p $BASEDIR/Uploads
mkdir -p $BASEDIR/Docs
mkdir -p $BASEDIR/Graphs
mkdir -p $BASEDIR/2D_data
if ! [ -w $BASEDIR ]; then
    echo -e "${red}  WARNING ${BASEDIR} is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/temp ]; then
    echo -e "${red}  WARNING ${BASEDIR}/temp is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/SummaryTracks ]; then
    echo -e "${red}  WARNING ${BASEDIR}/SummaryTracks is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/Uploads ]; then
    echo -e "${red}  WARNING ${BASEDIR}/Uploads is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/Docs ]; then
    echo -e "${red}  WARNING ${BASEDIR}/Docs is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/Graphs ]; then
    echo -e "${red}  WARNING ${BASEDIR}/Graphs is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/2D_data ]; then
    echo -e "${red}  WARNING ${BASEDIR}/2D_data is not writable by this user - it needs to be for the user that panoptes is run under"
fi

if [ -z ${SKIP_SQL} ]; then
    echo -e "${green}  Creating skeleton DB - if needed${NC}"
    cat << EOF > $PROJECT_ROOT/.monetdb
user=monetdb
password=monetdb
EOF
    DB=datasets
    if [ -d $BASEDIR/monetdb ]; then
        echo -e "${green}  dbfarm exists"
    else
        monetdbd create $BASEDIR/monetdb
    fi
    if [ -f $BASEDIR/monetdb/merovingian.pid ]; then
        echo -e "${green}  db server already running"
    else
        monetdbd start $BASEDIR/monetdb
    fi
    if monetdb create $DB ; then
        monetdb release $DB
        DOTMONETDBFILE=$PROJECT_ROOT/.monetdb mclient -d ${DB} < ${PROJECT_ROOT}/scripts/datasetindex.sql
    fi
else
    echo -e "${red}  SKIPPING Creating skeleton DB as SKIP_SQL set${NC}"
fi

echo -e "${green}  Linking BASEDIR/Docs to webapp/Docs${NC}"
cd $PROJECT_ROOT/build/DQXServer/static
rm -rf Docs
ln -s $BASEDIR/Docs Docs

cd $PROJECT_ROOT
SOURCEDATADIR=`python -c "import config;print config.SOURCEDATADIR"`
echo -e "${green}  SourceDataDir is ${SOURCEDATADIR} - making if it doesn't exist${NC}"
mkdir -p $SOURCEDATADIR
mkdir -p $SOURCEDATADIR/datasets
if find $SOURCEDATADIR/datasets -maxdepth 0 -empty | read v; then
    echo -e "${green}  SourceDataDir is empty - copying sample datasets${NC}"
    cp -r $PROJECT_ROOT/sampledata/* $SOURCEDATADIR
fi

#Don't need to do this in react world
#cd $PROJECT_ROOT
#if [ "$1" = "DEV" ]; then
#    echo -e "${green}  Creating DEVELOPMENT html${NC}"
#    PYTHONPATH=$PROJECT_ROOT python scripts/_render_templates.py DEBUG DEV
#else
#    echo -e "${green}  Creating PRODUCTION html${NC}"
#    VERSION=`uuidgen`
#    cp webapp/scripts/main-built.js webapp/scripts/main-built-$VERSION.js
#    PYTHONPATH=$PROJECT_ROOT python scripts/_render_templates.py PRODUCTION $VERSION
#fi
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