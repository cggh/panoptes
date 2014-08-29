.. |buttonnew| image:: /buttons/new.png
.. |buttonedit| image:: /buttons/edit.png
.. |buttonrun| image:: /buttons/run.png

.. _data-import-adddataset:

Creating a new dataset
----------------------

Using the admin web frontend, a new :ref:`dataset<dataconcept_dataset>` can be created by clicking the |buttonnew| icon, next to the top branch "*Datasets*".

In the dialog box, specify a unique identifier for this new dataset.

.. Note::
   This identifier will be used internally, and is different from the display name which is specified in the settings.
   The data will be imported into a database that has a name equal to this identifier.

.. Caution::
   Make sure that the identifier is a valid variable name (see :ref:`data-import-identifiers`).

This action creates a new source data directory for this dataset on the server (see also :ref:`def-source-dataset`).

Follow-up actions
~~~~~~~~~~~~~~~~~

Modify the settings:
  Click on the |buttonedit| icon left of the dataset label
  (see :ref:`data-import-settings` and  and :ref:`def-settings-dataset`).

Add a data table to this dataset:
  Click on the |buttonnew| icon right of the *"Datatables"* label in the dataset section
  (see :ref:`data-import-adddatatable`).

Import the source data:
  Importing a dataset from source the data to the server database does not happen automatically, and has to be initiated by the user.
  Click on the |buttonrun| icon left of the dataset label to initiate this import.
  (see :ref:`importdialog`).