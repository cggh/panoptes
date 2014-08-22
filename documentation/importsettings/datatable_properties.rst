
.. _def-settings-datatable-properties:

Datatable property settings
~~~~~~~~~~~~~~~~~
An overview of the possible tags than can be defined for an individual property in
the **Properties** tag of the datatable settings.

Id
  *Text (required).* Identifier of the property, corresponding to the column header in the [data] file

DataType:
  *Text (required)*. Data type of the values in the property.
  This can be ``Text``, ``Value``, ``HighPrecisionValue``, ``Boolean``,  ``GeoLongitude``, ``GeoLattitude``, ``Date``.

Name
  *Text (required).* Display name of the property.

Description
  *Text.* Description of the property. This will appear in hover tool tips and in the popup box if a user clicks on a property info button.

GroupId
  *Text.* Id of the Property group this property belongs to.

IsCategorical
  *Boolean.* Instructs Panoptes to treat the property as a categorical variable.
  For example, a combo box with the possible states is automatically shown in queries for this property.
  Categorical properties are automatically indexed.

CategoryColors
  *Block.* Specifies display colours for the categorical states of this property.
  Each token in the block links a possible value of the property to a color (for example: ``Accepted: rgb(0,192,0)``).
  The special value ``_other_`` can be used to specify a color for all other property values that are not listed.

MaxColumnWidth
  *Value.* Specifies the maximum pixel width used for the column representing this property in a table.
  Longer text will be abbreviated with ellipsis.

BarWidth
  *Value*. Draws a bar in the background of the table, indicating the value. This requires *MinVal* & *MaxVal* to be defined.

MinVal
  *Value.* For Value types, specifies the minimum value that can be reached.

MaxVal
  *Value.* For Value types, specifies the maximum value that can be reached.

DecimDigits
  *Value.* For Value types, specifies the number of decmimal digits that should be used to display the value

Index
  *Boolean.* If set, instructs Panoptes to create a database index for this property.
  For large datasets, this massively speeds up queries based on this property.

Search
  *Text.* Indicates that this field can be used for text search in the find data item wizard.
  Possible values: ``StartPattern``, ``Pattern``, ``Match``.

Relation
  *Block.* Defines a many-to-one foreign relation to a parent datatable.
  The parent table should contain a property with the same name as the key property in the child table.
  The block can contain the following tags:

    TableId
      *Datatable ID (required).* Datatable id of the relation parent table
    ForwardName
      *Text (required).* Display name of the relation from child to parent
    ReverseName
      *Text (required).* Display name of the relation from parent to child

ReadData
  *Boolean.* If set to false, this property will not be imported from the TAB-delimited source file. (*NOTE: under construction*).

CanUpdate: true
  *Boolean.* If set to true, this property can be modified by the user. (*NOTE: under construction*).

ShowInTable
  *Boolean*. If set, this property will appear by default in data table grids in the application.

ShowInBrowser
  *Boolean.* If set, this property will automatically appear as a track in the genome browser
  (only applies if *IsPositionOnGenome* is specified in database settings).

BrowserDefaultVisible
  *Boolean.* Indicates that the channel will activated by default in the genome browser (only applies if *ShowInBrowser* is set).

BrowserShowOnTop
  *Boolean.* Indicates that the channel will be shown in the top (non-scrolling) area of the genome browser.
  In this case, it will always be visible (only applies if *ShowInBrowser* is set).

ChannelName
  *Text.* Name of the genome browser channel this property will be displayed in.
  Properties sharing the same channel name will be displayed in overlay
  (only applies if *ShowInBrowser* is set).

ChannelColor
   *Text.* Colour used to display this property in the genome browser. Formatted as ``"rgb(r,g,b)"``
   (only applies if *ShowInBrowser* is set).

ConnectLines
   *Boolean.* Indicate that the points will be connected with lines in the genome browser
   (only applies if *ShowInBrowser* is set).

SummaryValues
  *Block.* Instructs Panoptes to apply a multiresolution summary algorithm for fast display of this property
  in the genome browser at any zoom level (only applies if *ShowInBrowser* is set). Possible tokens in this block:

    BlockSizeMin
      *Value (required).* Minimum summary block size (in bp)
    BlockSizeMax
      *Value (required).* Maximum summary block size (in bp)
    ChannelColor
      *Text.* Colour of the channel. Formatted as ``"rgb(r,g,b)"``.
