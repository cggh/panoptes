.. _def-source-datatable:

Data table source files
~~~~~~~~~~~~~~~~~~~~~~~
In the :ref:`dataset source folder<def-source-dataset>` folder, a subfolder ``datatables`` should be present.
This is the root for a set of folders, each one describing an individual :ref:`data table<dataconcept_datatable>`, with the name of the folder serves as an identifier.

In each *data table* folder, a file ``data`` should be present, containing a list of all the *data items* in the table.
Each line consists in a set of TAB-delimited *properties*.
The first line of the file serves as a header, specifying the identifiers for all *properties*.

In addition, a yaml ``settings`` file should be present in the *datatable* folder.
This file can contain a number of settings, both at the level of the *data table*,
as at the level of individual *properties* (see :ref:`def-settings-datatable`).

See also:

- :ref:`dataconcept_datatable`
- :ref:`def-source-data`