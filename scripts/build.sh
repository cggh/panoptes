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

echo "Building PANOPTES with configuration: $CONFIG"

echo "Fetching dependancies"
cd $PROJECT_ROOT
rm -rf dependencies
mkdir -p dependencies
cd dependencies
git clone git@github.com:malariagen/DQX.git
git clone git@github.com:malariagen/DQXServer.git

echo "Linking DQX"
cd $PROJECT_ROOT
rm -rf webapp/scripts/DQX
ln -s dependencies/DQX webapp/scripts/DQX
echo "Linking custom responders into DQXServer"
mkdir -p dependencies/DQXServer/customresponders
touch dependencies/DQXServer/customresponders/__init__.py
ln -s servermodule/* dependencies/DQXServer/customresponders/.


if [ -z "$WSGI_FOLDER" ]; then
	echo "WSGI_FOLDER not set, you need to manually serve dependencies/DQXServer/app.wsgi"
else
	echo "Symlinking DQX server at $WSGI_FOLDER/panoptes/$CONFIG"
	mkdir -p $WSGI_FOLDER/panoptes/$CONFIG
	rm -rf $WSGI_FOLDER/panoptes/$CONFIG/*
	ln -s $PROJECT_ROOT/dependencies/DQXServer/* $WSGI_FOLDER/panoptes/$CONFIG/.
fi

popd  > /dev/null

