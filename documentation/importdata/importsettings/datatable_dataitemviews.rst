.. _def-settings-datatable-dataitemviews:

DataItemViews settings
^^^^^^^^^^^^^^^^^^^^^^
The key *Type* for member of the data table settings key *DataItemViews* can have the following values:


type
  *Text (required).* Identifier of the custom view type (can be Overview, PropertyGroup, FieldList, ItemMap, PieChartMap) See DataItemViews settings for more details about defining custom data item views.
  Possible values:

  - ``Overview``: Specifies the default data item view of Panoptes, including all fields.
  - ``PropertyGroup``: Displays all properties that are member of a specific property group.
  - ``FieldList``: Displays a selection of properties for the data item.
  - ``ItemMap``: Displays the data item as a pin on a geographical map. Requires the presence of properties with data type GeoLongitude and GeoLatitude.
  - ``PieChartMap``: Defines a view that shows a set of pie charts on a geographic map (see example). This is achieved by combining information from two data tables:

    A locations data table. Each item in this data table defines a location where a pie chart is displayed.
    The current data table (where the view is defined), which contains the sizes of the pies for each data item as column values.

A set of properties of the current table is used to define pie sizes on all pie charts. For each pie and location combination there should be a property in the data table, containing the relative size of that specific pie..
  - ``Template``: A view that is defined by a template that is filled with row item properties.

Overview
::::::::
Specifies the default data item view of Panoptes, including all fields
name
  *Text (required).* Display name of this view.

Template
::::::::
A view that is defined by a template that is filled with row item properties
content
  *Text (required).* A `handlebars <http://handlebarsjs.com/>`_ template(only applies if *type* is Template).

PropertyGroup
:::::::::::::
Displays all properties that are member of a specific property group
groupId
  *Text (required).* Identifier of the property group to display(only applies if *type* is PropertyGroup).

FieldList
:::::::::
Displays a selection of properties for the data item
introduction
  *Text.* A static text that will be displayed on top of this view(only applies if *type* is FieldList).

fields
  *PropertyIDList (required).* Each item in this list specifies a property ID(only applies if *type* is FieldList).

ItemMap
:::::::
Displays the data item as a pin on a geographical map.
Requires the presence of properties with data type ``GeoLongitude`` and ``GeoLatitude``
mapZoom
  *Value (required).* Start zoom factor of the map (integer, minimum value of 0)(only applies if one of the following is true:(*type* is ItemMap)(*type* is PieChartMap)).

PieChartMap
:::::::::::
Defines a view that shows a set of pie charts on a geographic map
(see `example <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/datatables/variants/settings>`_).
This is achieved by combining information from two data tables:

- A locations data table. Each item in this data table defines a location where a pie chart is displayed.
- The current data table (where the view is defined), which contains the sizes of the pies for each data item as column values.

A set of properties of the current table is used to define pie sizes on all pie charts.
For each pie and location combination there should be a property in the data table,
containing the relative size of that specific pie
mapCenter
  *Block (required).* Specifies the map center in the start view(only applies if *type* is PieChartMap).
  The block can contain the following keys:
    longitude
      *Value (required).* Geographic longitude.

    latitude
      *Value (required).* Geographic latitude.


dataType
  *Text (required).* Type of values used to create the pie chart(only applies if *type* is PieChartMap).
  Possible values:

  - ``Fraction``: .

locationDataTable
  *Text (required).* ID of the data table containing the locations
  (this table should have properties with ``GeoLongitude`` and ``GeoLatitude`` data types)(only applies if *type* is PieChartMap).

locationSizeProperty
  *Text (required).* Property ID of the locations data table containing the size of the pie chart(only applies if *type* is PieChartMap).

locationNameProperty
  *Text (required).* Property ID of the locations data table containing the name of the pie chart(only applies if *type* is PieChartMap).

componentColumns
  *List (required).* Enumerates all the pies displayed on the pie charts, and binds them to properties of this data table
  (one for each combination of component x location)(only applies if *type* is PieChartMap).
  The block can contain the following keys:
    pattern
      *Text (required).* Property ID of the column providing the data.
      NOTE: the token {locid} will be replaced by the primary key value of the records in the locations data table.

    name
      *Text (required).* Display name of the pie.

    color
      *Text (required).* Color of the pie. Format: ``rgb(r,g,b)``.


residualFractionName
  *Text.* Name of the pie representing residual fraction (only applicable if the fractions do not sum up to 1)(only applies if *type* is PieChartMap).

