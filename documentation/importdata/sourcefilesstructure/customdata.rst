.. _def-source-customdata:

Custom data source files
~~~~~~~~~~~~~~~~~~~~~~~~

The ``customdata`` folder in a :ref:`workspace source folder<def-source-workspace>` should have a subfolder
for each *data table* it defines data for, and the folder name should be the *data table* identifier.
In this data table - specific folder, a number of subfolder can be defined,
each one specifying an individual :ref:`custom data source<dataconcept_customdata>`.
Such a subfolder should contain two files:

- ``data``. TAB-delimited file containing the custom property values
  (`example file <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/workspaces/workspace_1/customdata/variants/custom1/data>`_).

- ``settings``. (yaml formatted). Specifies how the custom data should be interpreted (see :ref:`def-settings-customdata`).

See also:

- :ref:`dataconcept_customdata`
- :ref:`def-source-data`