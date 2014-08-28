.. |buttonnew| image:: /buttons/new.png
.. |buttonedit| image:: /buttons/edit.png
.. |buttonrun| image:: /buttons/run.png
.. |buttonviewdata| image:: /buttons/viewdata.png

.. _data-import-addcustomdata:

Add a custom data source to a workspace
---------------------------------------

Using the admin web frontend, custom data can be added by clicking the button |buttonnew|, next to the label "*Custom data*",
under the tree branch that represents the workspace.

A dialog box appears that allows one to pick a TAB-delimited file from the local computer,
and upload it to the Panoptes server as a source file for a new custom data source.

- Click *"Choose file"* to select the local file that contains the data for this custom data source.
- Select the data table identifier to which this custom data should be attached to
- Click *"Create custom data file"* to create a new custom data source, based on this file.


This action creates a new custom data directory for this workspace on the server, and uploads the file as data source
(see also :ref:`def-source-data`).

**Notes**

- The name of the local source file will be used as an internal identifier for this custom data source.
- The columns in the source file will be mapped to extra properties of the data table,
  only visible in the context of the workspace this data source is loaded in.
- The column header name will be used as the property unique ID.
- The property ID's defined in this custom data source must be unique for this data table,
  and all other custom data sources associated with this data table.
- The custom data source **must** have a column with a name that corresponds to the primary key defined for this data table.
  The custom will be merged to the data table by joining the values of this primary key.


.. Caution::
   Make sure that the source file name, and the column headers are valid variable names (see :ref:`data-import-identifiers`).


Follow-up actions
~~~~~~~~~~~~~~~~~

Review the uploaded data file:
  Click on the |buttonviewdata| icon left of the data table label to bring up a top N row view of the uploaded source data.

Modify the settings:
  Click on the |buttonedit| icon left of the custom data label
  (see :ref:`data-import-settings`).

Import the source data:
  Updating a dataset from source the data to the server database does not happen automatically, and has to be initiated by the user.
  If the dataset was already imported earlier, the custom data can be added by clicking on the |buttonrun| icon left of the custom data label.
  This will only import the custom data, augmenting the already deployed database.
  (see :ref:`importdialog`).