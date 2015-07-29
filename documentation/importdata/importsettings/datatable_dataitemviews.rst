.. _def-settings-datatable-dataitemviews:

DataItemViews settings
^^^^^^^^^^^^^^^^^^^^^^
The key *Type* for member of the data table settings key *DataItemViews* can have the following values:


Type
  *Text (required).* Identifier of the custom view type (can be Overview, PropertyGroup, FieldList, ItemMap, PieChartMap) See DataItemViews settings for more details about defining custom data item views.
  Possible values:

  - ``Overview``: Specifies the default data item view of Panoptes, including all fields.
  - ``PropertyGroup``: Displays all properties that are member of a specific property group.
  - ``FieldList``: Displays a selection of properties for the data item.
  - ``ItemMap``: Displays the data item as a pin on a geographical map. Requires the presence of properties with data type GeoLongitude and GeoLattitude.
  - ``PieChartMap``: Defines a view that shows a set of pie charts on a geographic map (see example). This is achieved by combining information from two data tables:

    A locations data table. Each item in this data table defines a location where a pie chart is displayed.
    The current data table (where the view is defined), which contains the sizes of the pies for each data item as column values.

A set of properties of the current table is used to define pie sizes on all pie charts. For each pie and location combination there should be a property in the data table, containing the relative size of that specific pie..
  - ``Template``: A view that is defined by a template that is filled with row item properties.

Overview
::::::::
Specifies the default data item view of Panoptes, including all fields
Name
  *Text (required).* Display name of this view.

Template
::::::::
A view that is defined by a template that is filled with row item properties
Content
  *Text (required).* A `handlebars <http://handlebarsjs.com/>`_ template(only applies if *Type* is Template).

PropertyGroup
:::::::::::::
Displays all properties that are member of a specific property group
GroupId
  *Text (required).* Identifier of the property group to display(only applies if *Type* is PropertyGroup).

FieldList
:::::::::
Displays a selection of properties for the data item
Introduction
  *Text.* A static text that will be displayed on top of this view(only applies if *Type* is FieldList).

Fields
  *PropertyIDList (required).* Each item in this list specifies a property ID(only applies if *Type* is FieldList).

ItemMap
:::::::
Displays the data item as a pin on a geographical map.
Requires the presence of properties with data type ``GeoLongitude`` and ``GeoLattitude``
MapZoom
  *Value (required).* Start zoom factor of the map (integer, minimum value of 0)(only applies if one of the following is true:(*Type* is ItemMap)(*Type* is PieChartMap)).

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
PieChartSize
  *Value (required).* Displayed size of the largest pie chart(only applies if *Type* is PieChartMap).

MapCenter
  *Block (required).* Specifies the map center in the start view(only applies if *Type* is PieChartMap).
  The block can contain the following keys:
    Longitude
      *Value (required).* Geographic longitude.

    Lattitude
      *Value (required).* Geographic latitude.


DataType
  *Text (required).* Type of values used to create the pie chart(only applies if *Type* is PieChartMap).
  Possible values:

  - ``Fraction``: .

PositionOffsetFraction
  *Value (required).* An offset between the pie chart location and the actual chart,
  used to achieve a nice (ideally non-overlapping) view(only applies if *Type* is PieChartMap).

LocationDataTable
  *Text (required).* ID of the data table containing the locations
  (this table should have properties with ``GeoLongitude`` and ``GeoLattitude`` data types)(only applies if *Type* is PieChartMap).

LocationSizeProperty
  *Text (required).* Property ID of the locations data table containing the size of the pie chart(only applies if *Type* is PieChartMap).

LocationNameProperty
  *Text (required).* Property ID of the locations data table containing the name of the pie chart(only applies if *Type* is PieChartMap).

ComponentColumns
  *List (required).* Enumerates all the pies displayed on the pie charts, and binds them to properties of this data table
  (one for each combination of component x location)(only applies if *Type* is PieChartMap).
  The block can contain the following keys:
    Pattern
      *Text (required).* Property ID of the column providing the data.
      NOTE: the token {locid} will be replaced by the primary key value of the records in the locations data table.

    Name
      *Text (required).* Display name of the pie.

    Color
      *Text (required).* Color of the pie. Format: ``rgb(r,g,b)``.


ResidualFractionName
  *Text.* Name of the pie representing residual fraction (only applicable if the fractions do not sum up to 1)(only applies if *Type* is PieChartMap).

