#!/bin/bash

red='\e[0;31m'
green='\e[0;32m'
NC='\e[0m'

#release='Pn1.2'
release='master'


# target: Ubuntu 14.04.1 LTS

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

echo -e "${red}WARNING: This script is intended to be executed on a fresh Ubuntu image (e.g. an EC2 instance).${NC}"
echo -e "${red}Running this script will install and/or override several packages and settings on the system${NC}"
read -p  "Are you sure you want to continue? (yes/no) " userproceed
echo "$userproceed"
if [ "$userproceed" != 'yes' ]; then
    echo "Aborting"
    exit 1
fi
echo "Start installation"



apt-get update

apt-get -y install apache2
apt-get -y install libapache2-mod-wsgi

echo "mysql-server-5.6 mysql-server/root_password password 1234" | debconf-set-selections
echo "mysql-server-5.6 mysql-server/root_password_again password 1234" | debconf-set-selections
apt-get -y install mysql-server-5.6

apt-get -y install unzip wget git gcc gfortran python-dev python-virtualenv libblas-dev liblapack-dev cython libmysqlclient-dev
apt-get -y install libhdf5-serial-dev

cd /
mkdir panoptes
cd panoptes

mkdir basedir
mkdir basedir/temp
chmod a+w basedir/temp
mkdir basedir/SummaryTracks
chmod a+w basedir/SummaryTracks
mkdir basedir/Uploads
chmod a+w basedir/Uploads
mkdir basedir/Docs
chmod a+w basedir/Docs
mkdir basedir/Graphs
chmod a+w basedir/Graphs
mkdir basedir/2D_data
chmod a+w basedir/2D_data
mkdir sourcedata
chmod a+w sourcedata

wget --output-document=panoptes.zip https://github.com/cggh/panoptes/archive/${release}.zip
unzip panoptes.zip
mv panoptes-${release} source

cd source

cp scripts/deploy_default/config.py config.py

./scripts/build.sh

cp /etc/apache2/sites-enabled/000-default.conf /panoptes/bck_000-default
cp scripts/deploy_default/apache_settings /etc/apache2/sites-enabled/000-default.conf

ln -s /panoptes/source/build/DQXServer/wsgi_server.py /var/www/.

/etc/init.d/apache2 restart

echo -e "${green}Serving from [ServerName]/index.html"
