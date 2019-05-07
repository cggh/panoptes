.. _def-source-datatable:

Data table source files
~~~~~~~~~~~~~~~~~~~~~~~
In the :ref:`dataset source folder<def-source-dataset>` folder, a subfolder ``datatables`` should be present.
This is the root for a set of folders, each one describing an individual :ref:`data table<dataconcept_datatable>`,
with the name of the folder serving as an identifier.

In each *data table* folder, a file ``data`` should be present, containing a list of all the *data items* in the table.
Each line consists in a set of TAB-delimited *properties*.
The first line of the file serves as a header, specifying the identifiers for all *properties*
(`example file
<https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/datatables/variants/data>`_).

Alternatively a ``view`` file can be provided instead of a ``data`` file. The contents of the ``view`` file should be a MonetDB SQL Select statement that
references other tables in the dataset.

In addition, a yaml ``settings`` file should be present in the *data table* folder.
This file can contain a number of settings, both at the level of the *data table*,
as at the level of individual *properties* (see :ref:`def-settings-datatable`).

See also:

- :ref:`dataconcept_datatable`
- :ref:`def-source-data`