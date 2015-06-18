which virtualbox
if [ $? -ne 0 ]
then
  apt-get install virtualbox-ose
fi
which vagrant
if [ $? -ne 0 ]
then
  curl -L https://dl.bintray.com/mitchellh/vagrant/vagrant_1.7.2_x86_64.deb > vagrant.deb
  dpkg -i vagrant.deb
  rm vagrant.deb
fi

which chef-solo
if [ $? -ne 0 ]
then
  curl -L https://www.opscode.com/chef/install.sh | bash
fi
curl -L https://github.com/cggh/panoptes-boxes/archive/master.zip > panoptes-boxes.zip
unzip -f panoptes-boxes.zip
rm panoptes-boxes.zip
cd panoptes-boxes-master
cd common
./create-vendor-cookbooks.sh
./install-vagrant-plugins.sh
cd ../vagrant
vagrant up
echo "Panoptes is running at http://"`grep '"ip"' dev.json | awk -F\" '{print $4}'`
echo "Data files are at:"`pwd`"/panoptes/current/sampledata"
echo "To stop the vm type 'vagrant halt' in "`pwd`
echo "To start the vm type 'vagrant up' in "`pwd`
