.. _YAML: http://www.yaml.org/about.html


General dataset settings
------------------------
This YAML_ file contains settings for a :ref:`def-source-dataset`, and may contain the following tokens:

Name
  *Text (required).* The visible name of the dataset, as it appears in the intro page.

NameBanner
  *Text.* Visible name of the dataset, as it appears in the top banner of the app.

Description
  *Text.* A description of the dataset that will appear on the start page.

DataTables
  *List.* A list of the data table identifiers in the dataset.
  These names should correspond to directory names in the datatables source directory.
  This can be included in the settings to provide an explicit ordering of the data tables.
  If this tag is not provided, a default ordering wil be used.
