
.. _def-settings-datatable-dataitemviews:

DataItemViews settings
~~~~~~~~~~~~~~~~~~~~~~
The key *Type* for member of the data table settings key *DataItemViews* can have the following values:

Overview
........
Specifies the default data item view of Panoptes, including all fields. Other keys in this block:

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
  *List (required).* Each item in this list specifies a property ID.

ItemMap
.......
Displays the data item as a pin on a geographical map.
Requires the presence of properties with data type ``GeoLongitude`` and ``GeoLattitude``.

Name
  *Text (required)*. Display name of this view.
MapZoom:
  *Value (required)*. Start zoom factor of the map (integer, minimum value of 0).

PieChartMap
...........
Defines a view that shows a set of pie charts on a geographic map
(see `example <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/datatables/variants/settings>`_).
This is achieved by combining information from two data tables:
 - A locations data table. Each item in this data table defines a location where a pie chart is displayed.
 - The current data table (where the view is defined), which contains the sizes of the pies for each data item as column values.

A set of properties of the current table is used to define pie sizes on all pie charts.
For each pie and location combination there should be a property in the data table,
containing the relative size of that specific pie.

Key used to define this view:

Name
  *Text (required)*. Display name of the view.

PieChartSize
  *Value (required).* Displayed size of the largest pie chart.

MapCenter
  *Block (required).* Specifies the map center in the start view, and should contain the following keys:

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
  used to achieve a nice (ideally non-overlapping) view.

LocationDataTable
  *Text (required).* ID of the data table containing the locations
  (this table should have properties width ``GeoLongitude`` and ``GeoLattitude`` data types).

LocationSizeProperty
  *Text (required).* Property ID of the locations data table containing the size of the pie chart.

LocationNameProperty
  *Text (required).* Property ID of the locations data table containing the name of the pie chart.

ComponentColumns
  *List (required).* Enumerates all the pies displayed on the pie charts, and binds them to properties of this data table
  (one for each combination of component x location).
  Each list item should have the following keys:

    Pattern:
      *Text (required).* Property ID of the column providing the data.
      NOTE: the token {locid} will be replaced by the primary key value of the records in the locations data table.
    Name:
      *Text (required).* Display name of the pie.
    Color:
      *Text (required).* Color of the pie. Format: ``rgb(r,g,b)``.

ResidualFractionName
  *Text*. Name of the pie representing residual fraction (only applicable if the fractions do not sum up to 1).
