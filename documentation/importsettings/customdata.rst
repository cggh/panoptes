.. _YAML: http://www.yaml.org/about.html

.. _def-settings-customdata:

Custom data settings
--------------------
This YAML_ file contains settings for :ref:`def-source-customdata`, and may contain the following tokens:

AutoScanProperties
  *Boolean.* If set, Panoptes will try to automatically obtain property definitions from the TAB-delimited source data file.

PropertyGroups
  *List.*
  Each item in the list specifies a group of properties.
  It should contain two tags: "Id" representing a unique identifier for the group, and "Name" representing a display name.
  Property groups can be used to combine sets of related properties into sections in the app.

Properties
  *List (required)*
  The datatable yaml should contain a token "Properties", which contains a list of descriptions for all columns used in the app for this custom data table.
  See `Property settings`_ for an overview of the tokens that can be used for each individual item in this list.

DataItemViews
  *List.* Definitions of custom views that will appear in the
  popup for an individual datatable item. The views defined at the level of this
  custom data source will be added to the standard data item popup.
  Each item in the list should contain the following token:

  Type
    *Text (required).* Identifier of the custom view type
    (can be ``Overview``, ``PropertyGroup``, ``FieldList``, ``ItemMap``, ``PieChartMap``)
    See `DataItemViews`_ for more details about these custom views.
