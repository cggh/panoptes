which virtualbox
if [ $? -ne 0 ]
then
  sudo apt-get install virtualbox-ose
fi
which vagrant
if [ $? -ne 0 ]
then
  curl -L https://releases.hashicorp.com/vagrant/1.8.5/vagrant_1.8.5_x86_64.deb > vagrant.deb
  sudo dpkg -i vagrant.deb
  rm vagrant.deb
fi

which chef-solo
if [ $? -ne 0 ]
then
  sudo curl -L https://www.opscode.com/chef/install.sh | bash
fi
curl -L https://github.com/cggh/panoptes-boxes/archive/master.zip > panoptes-boxes.zip
unzip -o panoptes-boxes.zip
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
