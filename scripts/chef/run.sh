which chef-solo
if [ $? -ne 0 ]
then
  curl -L https://www.opscode.com/chef/install.sh | bash
fi
which berks
if [ $? -ne 0 ]
then
  apt-get install ruby-dev
  gem install berkshelf --no-ri --no-rdoc
  if [ $? -ne 0 ]
  then
    echo "Unable to install berkshelf - are you running as root?"
    exit
  fi
fi
source build/panoptes_virtualenv/bin/activate
export PYTHONPATH=./build/DQXServer
DBSRV=`python -c "import config;print config.DBSRV"`
DBUSER=`python -c "import config;print config.DBUSER"`
DBPASS=`python -c "import config;print config.DBPASS"`
SOURCEDATADIR=`python -c "import config;print config.SOURCEDATADIR"`
DB_POOL_SIZE=`grep ^innodb_buffer_pool_size /etc/mysql-default/conf.d/default.cnf | awk '{print $3}'`
INSTALL_ROOT=`dirname ${PWD}/..`
mkdir chef-install
cd chef-install
INSTALL_CHEF='::base'
#To install from scratch uncomment the following lines and change the password
#
#FULL_INSTALL='"mysql": { "server_root_password": "56789" },'
#INSTALL_CHEF=''


cat <<+++EOF > install.json
{
"panoptes": {
          "db_password": "${DBPASS}",
          "server_name": "`hostname`",
          "source_dir": "${SOURCEDATADIR}",
          "install_root": "${INSTALL_ROOT}",
          "git": { "revision": "master"} ,
          "database_buffer_pool_size": "${DB_POOL_SIZE}",
          "dev": true
        },
   ${FULL_INSTALL}
  "run_list": [ "recipe[apt]", "recipe[panoptes${INSTALL_CHEF}]" ]
}
+++EOF
if [ -d panoptes-boxes ]
then
  cd panoptes-boxes
  git pull origin master
  cd ..
else
  git clone https://github.com/cggh/panoptes-boxes.git
fi
cd panoptes-boxes/common
./create-vendor-cookbooks.sh
cd -
cat <<+++EOF > solo.rb
file_cache_path "/tmp/chef-solo"
cookbook_path cookbook_path [ '${PWD}/panoptes-boxes/common/vendor-cookbooks']
+++EOF
chef-solo -c solo.rb -j install.json
