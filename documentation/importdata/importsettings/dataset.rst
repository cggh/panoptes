.. _YAML: http://www.yaml.org/about.html


.. _def-settings-dataset:

General dataset settings
~~~~~~~~~~~~~~~~~~~~~~~~
This YAML_ file contains settings for a :ref:`dataset<dataconcept_dataset>`. See also:

- :ref:`data-import-settings`
- :ref:`data-import-adddataset`
- `Example file
  <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/settings>`_


Possible keys
.............

name
  *Text (required).* The visible name of the dataset, as it appears on the intro page.

nameBanner
  *Text.* Visible name of the dataset, as it appears on the top banner of the app.
  Note: this text may contain html markup.

dataTables
  *List.* A list of the data table identifiers in the dataset.
  These names should correspond to directory names in the *datatables* source directory (see :ref:`def-source-datatable`).
  This can be included in the settings in order to provide an explicit ordering of the data tables in the app.
  If this key is not provided, a default ordering wil be used.

twoD_DataTables
  *List.* List the 2D data tables that should be exposed in the app.

googleAnalyticsId
  *Text.* .

initialSessionState
  *Block.* The default tabs, popups and recently used genes and queries for a new session. Most easily set by using the save button on the header (only shown to managers).

genomeBrowserChannelSets
  *List.*  Default:[].  A list of exmaple channel configurations that will be shown on the genome browser sidebar.
  The block can contain the following keys:
    channels
      *List (required).* List of serialised channels.

    name
      *Text (required).* Channel set name.

    description
      *Text (required).* Channel set description.



