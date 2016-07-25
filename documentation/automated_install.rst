
Installation
............

Using a VM Quickstart
.....................


The easiest way to install is to download the appropriate script from the panoptes repo on github.

You do not need the whole panoptes repository and in many ways it's better not to clone it at this point

This script will install all the dependencies you need to use the panoptes-boxes <https://github.com/cggh/panoptes-boxes> project and use the Vagrant based creation of a VM.

Linux <https://raw.githubusercontent.com/cggh/panoptes/master/scripts/linux-vm-install.sh>

Mac <https://raw.githubusercontent.com/cggh/panoptes/master/scripts/mac-vm-install.sh>

For Windows it's more complicated as a reboot is required after the tools have been installed

Windows Install Tools <https://raw.githubusercontent.com/cggh/panoptes/master/scripts/windows-vm-install.bat>

Windows VM install <https://raw.githubusercontent.com/cggh/panoptes/master/scripts/windows-vm-run.bat>

Once you have run this script(s) then you should be able to go to the Panoptes VM <http://192.168.56.32>

You will see a shared folder called panoptes-boxes-master/vagrant/panoptes/master - you can put your data in here (in sampledata) and it will be accessible from the panoptes VM (note than although you can't use links from elsewhere on your machine it is possible to use a bind mount)

Networking
..........

If you haven't been using VirtualBox before then you will need to create a host only network, this can either be done from VirtualBox or via the command line tools

Create a host-only network interface for VirtualBox (unless ``ifconfig -a`` already lists ``vboxnet0``)::

   VBoxManage hostonlyif create >/dev/null 2>&1


The IP address of the VM is defined in the file dev.json and by default is 192.168.56.32 (in dev.json)

Now assign an IP to this interface with a subnet that doesn't conflict with your home ones (avoid ``192.168.0.x``), for example ``192.168.56.x``::

   vboxmanage hostonlyif ipconfig vboxnet0 --ip 192.168.56.1 --netmask 255.255.255.0


Using the VM
............

From the panoptes-boxes-master/vagrant directory:

The script will start the Vagrant based VM for you but in future it can be started via the ``vagrant up`` command, and stopped via ``vagrant halt``. To log in to the box use ``vagrant ssh``. The VM will also be shown in your VirtualBox UI.

If you want to load the sample data into panoptes then you can add ``panoptes::sampledata`` to the runlist in dev.json and run ``vagrant provision``

To do a one off rebuild of the app add the ``panoptes::rebuild`` recipe otherwise it will use the latest release.

If you want to start again from scratch then the following commands will make a completely new clean VM.::
   vagrant destroy -f && rm -rf panoptes && vagrant up

If you want to use a different version then change the git revision in dev.json e.g. for Pn1.6.2::

          "git": { "revision": "Pn1.6.2"} , (or you can use a hash)


Development
...........

panoptes has been cloned from github via the recipe but note that it uses the https url so if you want to make changes you will want to ``git remote set-url origin git@github.com:cggh/panoptes.git`` in the panoptes/master directory. You will also want to change branch as the deploy branch is used by default.

Any changes to the python code will be automatically picked up (due to the wsgi_monitor recipe) so you don't need to log in to the VM for changes to python.


Other options
.............

Packer can be used to create an AMI configured in the same way as the Vagrant VM - see the panoptes-boxes/packer directory

If you want to install the dependencies on your local machine in the same way as for the VM/AMI then you can use the same installation method by using this Chef script <https://github.com/cggh/panoptes/blob/master/scripts/chef/run.sh>
