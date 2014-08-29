.. _def-source-dataset:

Dataset source files
~~~~~~~~~~~~~~~~~~~~
The ``config.SOURCEDATADIR`` folder should contain a folder ``datasets``, serving as a root for
all :ref:`datasets<dataconcept_dataset>` being served by the Panoptes instance.

In this folder, a subfolder should be present for each *dataset*.
The folder name is used as the unique identifier of this dataset.
In the *dataset* folder, a yaml ``settings`` file should be present, specifying the displayed name of the dataset,
and an optional description (see :ref:`def-settings-dataset`).

See also:

- :ref:`dataconcept_dataset`
- :ref:`def-source-data`