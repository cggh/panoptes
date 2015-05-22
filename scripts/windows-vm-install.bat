rem Windows 7
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://dl.bintray.com/mitchellh/vagrant/vagrant_1.7.2.msi', 'vagrant_1.7.2.msi')"
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://opscode-omnibus-packages.s3.amazonaws.com/windows/2008r2/x86_64/chefdk-0.5.1-1.msi', 'chefdk-0.5.1-1.msi')"
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://github.com/cggh/panoptes-boxes/archive/master.zip', 'master.zip')"
powershell -Command "(New-Object Net.WebClient).DownloadFile('http://download.virtualbox.org/virtualbox/4.3.28/VirtualBox-4.3.28-100309-Win.exe', 'VirtualBox-4.3.28-100309-Win.exe')"
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://github.com/msysgit/msysgit/releases/download/Git-1.9.5-preview20150319/Git-1.9.5-preview20150319.exe', 'Git-1.9.5-preview20150319.exe')"
rem Windows 8
rem powershell -Command "Invoke-WebRequest http://www.foo.com/package.zip -OutFile package.zip"
vagrant_1.7.2.msi
chefdk-0.5.1-1.msi
VirtualBox-4.3.28-100309-Win.exe
Git-1.9.5-preview20150319.exe
powershell -Command "(new-object -com shell.application).namespace((Get-Location).Path).CopyHere((new-object -com shell.application).namespace((Get-Location).Path + '\master.zip').Items(),16)"
