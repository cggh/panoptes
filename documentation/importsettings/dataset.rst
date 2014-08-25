.. _YAML: http://www.yaml.org/about.html


.. _def-settings-dataset:

General dataset settings
------------------------
This YAML_ file contains settings for a :ref:`def-source-dataset`, and may contain the following keys:

Name
  *Text (required).* The visible name of the dataset, as it appears on the intro page.

NameBanner
  *Text.* Visible name of the dataset, as it appears on the top banner of the app.
  Note: this text may contain html markup.

Description
  *Text.* A description of the dataset that appears on the start page.
  Note: this text may contain html markup.
  A longer description can be split over several lines by writing a ``>`` sign on the key line,
  and indent subsequent lines::
     Description: >
        This web application provides an interactive view
        on the data ...

DataTables
  *List.* A list of the data table identifiers in the dataset.
  These names should correspond to directory names in the *datatables* source directory (see :ref:`def-source-datatable`).
  This can be included in the settings in order to provide an explicit ordering of the data tables in the app.
  If this key is not provided, a default ordering wil be used.
