.. |buttonnew| image:: /buttons/new.png
.. |buttonedit| image:: /buttons/edit.png
.. |buttonrun| image:: /buttons/run.png
.. |buttonviewdata| image:: /buttons/viewdata.png
.. |buttonimport| image:: /buttons/import.png

.. _data-import-addannotation:

Add reference genome annotation
-------------------------------

Using the admin web frontend, :ref:`reference genome<dataconcept_refgenome>` annotation data can be added to a dataset
by

1. Clicking the |buttonimport| icon to the left of the label "**Reference genome**",
   under the tree branch that represents the dataset.
2. Click the button "Annotation" in the popup.

A dialog box appears that allows one to pick a GFF annotation file from the local computer,
and upload it to the Panoptes server as a source file for genome annotation.

- Click *"Choose file"* to select the local file that contains the genome annotation.
- Click *"Create annotation"* to define this file as the source of annotation.

Follow-up actions
~~~~~~~~~~~~~~~~~

Modify the reference genome settings:
  1. Click on the |buttonedit| icon left of the label "**Reference genome**"
  2. Click on the button "Edit Settings" in the popup.
     (see :ref:`data-import-settings` and :ref:`def-settings-refgenome`)

Edit the chromosome definitions:
  1. Click on the |buttonedit| icon left of the label "**Reference genome**"
  2. Click on the button "Edit Chromosome definition" in the popup.

Import the source data:
  Updating a dataset from source the data to the server database does not happen automatically, and has to be initiated by the user.
  Click on the |buttonrun| icon left of the dataset label to initiate this import.
  (see :ref:`importdialog`).