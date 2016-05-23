#!/bin/bash -e

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

if [ -z "$1" ]
  then
    echo "No version argument supplied"
    exit
fi

#Tests of sampledata config
bash tests/runtests.sh
bash scripts/generateDocs.sh
git rm -fr webapp/dist || true
cd webapp
npm run build
cd ..
git add -u
git add webapp/dist/*
echo $1
git commit -m "Pre-release tasks" || true #Might fail due to no changes
git push origin master
echo git tag -a $1 -m "$1"
git push --tags