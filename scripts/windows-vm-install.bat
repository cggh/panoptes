rem Windows 7
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://releases.hashicorp.com/vagrant/1.8.5/vagrant_1.8.5.msi', 'vagrant_1.8.5.msi')"
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://opscode-omnibus-packages.s3.amazonaws.com/windows/2008r2/x86_64/chefdk-0.5.1-1.msi', 'chefdk-0.5.1-1.msi')"
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://github.com/cggh/panoptes-boxes/archive/master.zip', 'master.zip')"
powershell -Command "(New-Object Net.WebClient).DownloadFile('http://download.virtualbox.org/virtualbox/5.1.2/VirtualBox-5.1.2-108956-Win.exe', 'VirtualBox-5.1.2-108956-Win.exe')"
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://github.com/msysgit/msysgit/releases/download/Git-1.9.5-preview20150319/Git-1.9.5-preview20150319.exe', 'Git-1.9.5-preview20150319.exe')"
rem Windows 8
rem powershell -Command "Invoke-WebRequest http://www.foo.com/package.zip -OutFile package.zip"
vagrant_1.8.5.msi
chefdk-0.5.1-1.msi
VirtualBox-5.1.2-108956-Win.exe
Git-1.9.5-preview20150319.exe
powershell -Command "(new-object -com shell.application).namespace((Get-Location).Path).CopyHere((new-object -com shell.application).namespace((Get-Location).Path + '\master.zip').Items(),16)"
