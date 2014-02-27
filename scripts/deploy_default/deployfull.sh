
release='Pn1.0'

#echo "mysql-server-5.5 mysql-server/root_password password 1234" | debconf-set-selections
#echo "mysql-server-5.5 mysql-server/root_password_again password 1234" | debconf-set-selections
#apt-get -y install mysql-server-5.5

#apt-get install unzip wget git gcc gfortran python-dev python-virtualenv libblas-dev liblapack-dev cython libmysqlclient-dev
#apt-get install libhdf5-serial-dev

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
mkdir sourcedata
chmod a+w sourcedata

wget --output-document=panoptes.zip https://github.com/malariagen/panoptes/archive/${release}.zip
unzip panoptes.zip
mv panoptes-${release} source

cp source/scripts/deploy_default/config.py config.py

./scripts/build.sh