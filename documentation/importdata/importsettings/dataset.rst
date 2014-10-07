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

Name
  *Text (required).* The visible name of the dataset, as it appears on the intro page.

NameBanner
  *Text.* Visible name of the dataset, as it appears on the top banner of the app.
  Note: this text may contain html markup.

Description
  *Text.* A description of the dataset that appears on the start page.
  Note: this text may contain html markup, and documentation links (see :ref:`def-source-docs`).
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


IntroRightPanelFrac
  *Value.* Controls the proportion of left and right columns on the start page. If set to zero, the right column will be absent.


IntroSections
  *List.* Enumerates sections on the intro page that can contain quick start buttons to specific views in the app.
  Buttons can be added to these sections by (1) clicking on the "Get Link" button in the top right corner of the app,
  (2) clicking on one of the "Add to start page" options, and (3) entering the right section id in the "Section" edit box.
  Similarly, a button displaying a plot can be created by clicking the link button in the plot popup.

  Each item in the list may contain the following tags:

  Id
     *Text.* Unique identifier of the section.
  Name
     *Text.* Displayed title.
  Content
     *Text.* Intro text of the section, appearing above the buttons. This text can be HTML formatted.
  RightPanel
     *Boolean.* If set, the section will appear in the right column, replacing the default content of this column.
