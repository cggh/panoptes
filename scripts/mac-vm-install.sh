ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
brew tap phinze/homebrew-cask && brew install brew-cask
brew cask install virtualbox
brew cask install vagrant
brew cask install vagrant-manager
vagrant box add ubuntu/trusty64
brew cask install chefdk
wget https://github.com/cggh/panoptes-boxes/archive/master.zip 
unzip -o master.zip
rm master.zip
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
