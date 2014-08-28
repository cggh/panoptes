.. |buttonrun| image:: /buttons/run.png

Importing datasets
------------------
Importing a dataset source does not happen automatically, and has to be initiated by the user.
After installation, a number of sample dataset sources are copied into the source data folder, and are ready to be imported.

- Start the Panoptes app in a browser.
- In the intro screen, click on the hyperlink "Open admin page".
  This creates a new tab in the browser, showing the administration section of the app.
- The administration section shows the available source data file sets as a tree.
  Click on the cog wheel icon (|buttonrun|) on the left of the dataset you want to import (e.g. "Samples_and_Variants").
  An :ref:`importdialog` appears.
- Check the option "Full import".
- Click the button "Import".
- This initiates the data import. A progress box is shown during this action.
- Upon completion, a new item appears in the list "Server calculations".
  Clicking on this shows a log of the import activities. If an error occurred, this can be useful for troubleshooting.
- Go back to the browser tab with the Panoptes intro screen, and reload the app by clicking the browser
  refresh button to retrieve the updated dataset information.
- The imported dataset should appear in the list.

See also:

.. toctree::
   :maxdepth: 1

   importdialog

