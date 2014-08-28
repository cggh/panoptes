.. |buttonnew| image:: /buttons/new.png
.. |buttonedit| image:: /buttons/edit.png
.. |buttonrun| image:: /buttons/run.png
.. |buttonviewdata| image:: /buttons/viewdata.png

.. _data-import-adddatatable:

Add a new data table to a dataset
---------------------------------

Using the admin web frontend, a new data table can be created by clicking the button |buttonnew|, next to the label "*Datatables*",
under the tree branch that represents the dataset.

A dialog box appears that allows one to pick a TAB-delimited file from the local computer,
and upload it to the Panoptes server as a source file for a new data table.

- Click *"Choose file"* to select the local file that contains the data for this data table.
- Click *"Create data table"* to create a new data table source, based on this file.

.. Note::
   The name of the local source file will be used as an internal identifier for this data table.
   The data will be imported into a database table that has a name equal to this identifier.

.. Caution::
   Make sure that the file name is a valid variable name (see :ref:`data-import-identifiers`).


This action creates a new data table directory for this dataset on the server, and uploads the file as data source
(see also :ref:`def-source-data`).

Follow-up actions
~~~~~~~~~~~~~~~~~

Review the uploaded data file:
  Click on the |buttonviewdata| icon left of the data table label to bring up a top N row view of the uploaded source data.

Modify the settings:
  Click on the |buttonedit| icon left of the data table label
  (see :ref:`data-import-settings`).

Import the source data:
  Click on the |buttonrun| icon left of the dataset label
  (see :ref:`importdialog`).