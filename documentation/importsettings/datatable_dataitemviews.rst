
.. _def-settings-datatable-dataitemviews:

DataItemViews settings
~~~~~~~~~~~~~~~~~~~~~~
The token *Type* for member of the datatable token *DataItemViews* can have the following values:

Overview
........
Specifies the default data item view of Panoptes, including all fields. Possible tokens:

Name
  *Text (required)*. Display name of this view.

PropertyGroup
.............
Displays all properties that are member of a specific property group.

GroupId
  *Text (required).* Identifier of the property group to display.

FieldList
.........
Displays a selection of properties for the data item.

Name
  *Text (required).* Display name of this view.
Introduction
  *Text.* A static text that will be displayed on top of this view.
Fields
  *List (required).* Each item in this list should be a property ID.

ItemMap
.......
Displays the item as a pin on a geographical map.
Requires the presence of properties with data type ``GeoLongitude`` and ``GeoLattitude``.

Name
  *Text (required)*. Display name of this view.
MapZoom:
  *Value (required)*. Start zoom factor of the map (integer, minimum value of 0).

PieChartMap
...........
Defines a view that shows a set of pie charts on a geographic map.
This is achieved by combining information from two datatables:

 - A locations datatable. Each item in this datatable defines a location and will display a pie chart.
 - The current datatable (where the view is defined).

A set of properties of the current table is used to define pies on all pie charts.
There has to be a property for each pie and location combination,
and the value of that property contains the relative size of that specific pie.

Name
  *Text (required)*. Display name of this view.

PieChartSize
  *Value (required).* Size of the largest pie chart

MapCenter
  *Block (required).* Specifies the start map center, and should contain the following tokens:

   Longitude
     *Value (required).* Geographic longitude.
   Lattitude
     *Value (required).* Geographic latitude.

MapZoom
  *Value (required).* Start zoom factor of the map (integer, minimum value of 0).

DataType
  *Text (required).* Type of values used to create the pie chart. Possible states: ``Fraction``.

PositionOffsetFraction
  *Value (required).* An offset between the pie chart location and the actual chart,
  used to achieve a nice (nonoverlapping) view.

LocationDataTable
  *Text (required).* ID of the datatable containing the locations (should have properties width ``GeoLongitude`` and ``GeoLattitude`` data types).

LocationSizeProperty
  *Text (required).* Property ID of the locations datatable containing the size of the pie chart.

LocationNameProperty
  *Text (required).* Property of the locations datatable containing the name of the pie chart.

ComponentColumns
  *List (required).* Enumerates all the pies of the pie charts, and binds them to properties of this datatable (one for each component x location).
  Each list item should have the following tokens:

    Pattern:
      *Text (required).* Column name providing the data. NOTE: {locid} will be replaced by the location primary key value.
    Name:
      *Text (required).* Name of the pie
    Color:
      *Text (required).* Color of the pie. Format: ``rgb(r,g,b)``.

ResidualFractionName
  *Text*. Name of the residual fraction (if any).
