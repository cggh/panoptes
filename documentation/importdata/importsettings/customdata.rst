.. _YAML: http://www.yaml.org/about.html

.. _def-settings-customdata:

Custom data settings
~~~~~~~~~~~~~~~~~~~~
This YAML_ file contains settings for a :ref:`custom data source<dataconcept_customdata>`. See also:

- :ref:`data-import-settings`
- :ref:`data-import-addcustomdata`

Possible keys
.............

AutoScanProperties
  *Boolean.* If set, Panoptes will try to automatically obtain property definitions from the TAB-delimited source data file.

PropertyGroups
  *List.*
  Each item in the list specifies a group of properties.
  It should contain two keys: "Id" representing a unique identifier for the group, and "Name" representing a display name.
  Property groups can be used to combine sets of related properties into sections in the app.

Properties
  *List (required)*
  The data table yaml should contain a key "Properties", which contains a list of descriptions for all columns used in the app for this custom data table.
  See :ref:`def-settings-datatable-properties` for an overview of the keys that can be used for each individual item in this list.

DataItemViews
  *List.* Definitions of custom views that will appear in the
  popup for an individual datatable item. The views defined at the level of this
  custom data source will be added to the standard data item popup.
  Each item in the list should contain the following key:

Type
  *Text (required).* Identifier of the custom view type
  (can be ``Overview``, ``PropertyGroup``, ``FieldList``, ``ItemMap``, ``PieChartMap``)
  See :ref:`def-settings-datatable-dataitemviews` for more details about these custom views.
