.. _def-source-docs:

Documentation source files
~~~~~~~~~~~~~~~~~~~~~~~~~~
A :ref:`dataset source folder<def-source-dataset>` may optionally contain a subfolder ``doc``,
containing html files that can be displayed in Panoptes' internal documentation viewer.

These files should follow proper HTML formatting, similar to the contents of a normal <body> tag.

A <title> tag can be used to specify the name given to the tab or popup where the content appears.

These documents may be referred to in other components of the source data, such as descriptions of the dataset or data tables.
Referring happens through a hyperlink with the structure ``<DocLink href="[filename]">hyperlink display name</DocLink>``.


On the deployment, this will render as a hyperlink that leads to an in-app tab showing the documentation in the source file.