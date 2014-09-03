.. _def-source-docs:

Documentation source files
~~~~~~~~~~~~~~~~~~~~~~~~~~
A :ref:`dataset source folder<def-source-dataset>` may optionally contain a subfolder ``doc``,
containing html files that can be displayed in Panoptes' internal documentation viewer.

These files should follow proper XML formatting, and contain a ``<body>`` element.
The html may contain hyperlinks to other documentation files in the same source directory, or to external links.

These documents may be referred to in other components of the source data, such as descriptions of the dataset or data tables.
Referring happens through a hyperlink with the structure ``<a class="doclink" href="[docid]">hyperlink display name</a>``,
with [docid] the file name of the document file *without the .html extension*.

On the deployment, this will render as a hyperlink that leads to an in-app popup showing the documentation in the source file.