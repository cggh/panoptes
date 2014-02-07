Datasets
=============================
.. _import-datasets:
Importing datasets
------------------
Panoptes imports datasets into the server database from source data, consisting in sets of simple, structured files. 
These source data files are located in SOURCEDATADIR/datasets (as specified in config.py). 
The structure of these source data files is described in more detail in `Source files structure`_.
Importing a dataset source does not happen automatically, and has to be initiated by the user.

After installation, a number of sample dataset sources are copied into the source data folder, and are ready to be imported.

- Start the Panoptes app in a browser.
- In the intro screen, click on the hyperlink "Admin tool". This creates a new tab in the browser,
  showing the administration section of the app.
- The administration section shows the available source data file sets as a tree. Click on a dataset name you want to import (e.g. "Sample1")
- Click the button "Load highlighted file source", and click "Load all data" in the popup that appears
- This initiates the data import. A progress box is shown during this action.
- Upon completion, a new item appears in the list "Server calculations". Clicking on this shows a log of the import activities.
  If an error occurred, this can be useful for troubleshooting.
- Go back to the browser tab with the Panoptes intro screen, and reload the app to retrieve the updated dataset information
- The imported dataset should appear in the list.

Panoptes data structure
-----------------------
Terminology
~~~~~~~~~~~
The data server by Panoptes is structured according to a number of central  concept.

**Dataset**
  Lorem ipsut ...
  
**Datatable**
  Lorem ipsut ...
  
**Data item**
  Lorem ipsut ...

**Workspace**
  Lorem ipsut ...
  
@@Todo: get terminology from docx file.
  

  

Source files structure
----------------------
