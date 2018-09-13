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

cd $PROJECT_ROOT
echo -e "${green}  Fetching dependancies${NC}"
echo -e "${green}    Python dependancies${NC}"
if [ ! -d panoptes_virtualenv ]
then
  virtualenv panoptes_virtualenv
fi

source panoptes_virtualenv/bin/activate
#Have to do numpy first as h5py does not stipulate it as an install requirement....
echo -e "${green}      NumPy...${NC}"
pip install  numpy
echo -e "${green}      Panoptes requirements...${NC}"
pip install  -r $PROJECT_ROOT/server/REQUIREMENTS
echo -e "${green}      gunicorn...${NC}"
pip install  gunicorn==19.1.0 #For testing and instant run, not a strict requirement

echo pythoncommand = \'`which python`\' >> config.py
BASEDIR=`python -c "import config;print config.BASEDIR"`
echo -e "${green}  Basedir is ${BASEDIR} - making if it doesn't exist"
mkdir -p $BASEDIR
mkdir -p $BASEDIR/temp
mkdir -p $BASEDIR/Uploads
mkdir -p $BASEDIR/Docs
mkdir -p $BASEDIR/Maps
mkdir -p $BASEDIR/Graphs
mkdir -p $BASEDIR/2D_data
if ! [ -w $BASEDIR ]; then
    echo -e "${red}  WARNING ${BASEDIR} is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/temp ]; then
    echo -e "${red}  WARNING ${BASEDIR}/temp is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/Uploads ]; then
    echo -e "${red}  WARNING ${BASEDIR}/Uploads is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/Docs ]; then
    echo -e "${red}  WARNING ${BASEDIR}/Docs is not writable by this user - it needs to be for the user that panoptes is run under"
fi
if ! [ -w $BASEDIR/Maps ]; then
    echo -e "${red}  WARNING ${BASEDIR}/Maps is not writable by this user - it needs to be for the user that panoptes is run under"
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
        echo -e "${green}  dbfarm exists${NC}"
    else
        monetdbd create $BASEDIR/monetdb
    fi
    monetdbd set passphrase=monetdb $BASEDIR/monetdb
    monetdbd set control=True $BASEDIR/monetdb
    if [ -f $BASEDIR/monetdb/merovingian.pid ]; then
        echo -e "${green}  db server already running${NC}"
    else
        monetdbd start $BASEDIR/monetdb
    fi
    if monetdb create datasets ; then
        monetdb release datasets
        DOTMONETDBFILE=$PROJECT_ROOT/.monetdb mclient -d datasets < ${PROJECT_ROOT}/scripts/datasetindex.sql
    fi
else
    echo -e "${red}  SKIPPING Creating skeleton DB as SKIP_SQL set${NC}"
fi

echo -e "${green}  Linking BASEDIR/Docs to served directory ${NC}"
mkdir -p $PROJECT_ROOT/webapp/dist/panoptes
cd $PROJECT_ROOT/webapp/dist/panoptes
rm -rf Docs
ln -sf $BASEDIR/Docs Docs

echo -e "${green}  Linking BASEDIR/Maps to served directory ${NC}"
rm -rf Maps
ln -sf $BASEDIR/Maps Maps

cd $PROJECT_ROOT
SOURCEDATADIR=`python -c "import config;print config.SOURCEDATADIR"`
echo -e "${green}  SourceDataDir is ${SOURCEDATADIR} - making if it doesn't exist${NC}"
mkdir -p $SOURCEDATADIR
mkdir -p $SOURCEDATADIR/datasets
if find $SOURCEDATADIR/datasets -maxdepth 0 -empty | read v; then
    echo -e "${green}  SourceDataDir is empty - copying sample datasets${NC}"
    cp -r $PROJECT_ROOT/sampledata/* $SOURCEDATADIR
fi

echo -e "${green}  Linking SOURCEDIR/components to webapp/src/js/components/custom"
mkdir -p $SOURCEDATADIR/components
ln -sf $SOURCEDATADIR/components $PROJECT_ROOT/webapp/src/js/components/custom

echo -e "${green}Done!${NC}"

popd  > /dev/null
