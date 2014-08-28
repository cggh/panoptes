.. |buttonnew| image:: /buttons/new.png
.. |buttonedit| image:: /buttons/edit.png
.. |buttonrun| image:: /buttons/run.png

.. _data-import-addworkspace:

Add a new workspace to a dataset
---------------------------------

Using the admin web frontend, a new data workspace can be created by clicking the button |buttonnew|, next to the label "*Workspaces*",
under the tree branch that represents the dataset.

In the dialog box, specify a unique identifier for this new workspace.

.. Note::
   This identifier will be used internally, and is different from the display name which is specified in the settings.

.. Caution::
   Make sure that the identifier is a valid variable name (see :ref:`data-import-identifiers`).

This action creates a new workspace directory for this dataset on the server (see also :ref:`def-source-data`).

Follow-up actions
~~~~~~~~~~~~~~~~~

Modify the settings:
  Click on the |buttonedit| icon left of the workspace label
  (see :ref:`data-import-settings`).

Add custom data to this workspace:
  Click on the |buttonnew| icon right of the *"Custom data"* label in the workspace section
  (see :ref:`data-import-addcustomdata`).

Re-import the source data:
  Updating a dataset from source the data to the server database does not happen automatically, and has to be initiated by the user.
  Click on the |buttonrun| icon left of the dataset label
  (see :ref:`importdialog`).