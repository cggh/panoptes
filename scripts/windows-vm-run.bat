cd panoptes-boxes-master
cd common
rem Depending on where git has been installed
set GITHOME=%LOCALAPPDATA%\Programs
rem set GITHOME=%SYSTEMDRIVE%\Program Files (x86)
"%GITHOME%\Git\bin\sh.exe" -c "./create-vendor-cookbooks.sh"
vagrant plugin install vagrant-omnibus
vagrant plugin install vagrant-vbguest
vagrant plugin install vagrant-hosts
cd ..
cd vagrant
rem Vagrant file references dev.json
copy windows.json dev.json
vagrant up

