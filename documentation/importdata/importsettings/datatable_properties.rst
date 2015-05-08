
.. _def-settings-datatable-properties:

Datatable property settings
^^^^^^^^^^^^^^^^^^^^^^^^^^^
An overview of the possible keys than can be defined for an individual property in
the *Properties* block of the data table settings.

Id
  *Text (required).* Identifier of the property, equal to the corresponding column header in the TAB-delimited source file ``data``.

DataType:
  *Text (required)*. Data type of the values in the property.
  Possible values:

  - ``Text``: text strings.
  - ``Value``: numerical values (integer of decimal; the distincion is made by the key *DecimDigits*).
    Absent values can be coded by an empty string, "NA", "None", "NULL", "null", "inf" or "-".
  - ``HighPrecisionValue``: same as ``Value``, with higher precision.
  - ``Boolean``: Yes/No binary states. Possible values: "true", "yes", "y", "1", "false", "no", "n", "0".
    Absent values are coded by an empty string.
  - ``GeoLongitude``: longitude part of a geographical coordinates (in decimal degrees).
    Absent values are coded by an empty string.
  - ``GeoLattitude``: latitude part of a geographical coordinates (in decimal degrees).
    Absent values are coded by an empty string.
  - ``Date``: calendar dates, ISO formatted (i.e. YYYY-MM-DD).
    Absent values are coded by an empty string.

Name
  *Text (required).* Display name of the property.

Description
  *Text.* Brief description of the property.
  This will appear in hover tool tips and in the popup box if a user clicks a property info button.

GroupId
  *Text.* Id of the Property group this property belongs to.

ExternalUrl:
  *Text.* A url that should be opened when the user clicks on a value of this property. The url should
  be formatted as a template, with ``{value}`` interpolated to the property value. Multiple links can be specified by separating the values with semi-colons.
  For example: ``http://www.ebi.ac.uk/ena/data/view/{value}``.

IsCategorical
  *Boolean.* Instructs Panoptes to treat the property as a categorical variable.
  For example, a combo box with the possible states is automatically shown in queries for this property.
  Categorical properties are automatically indexed.

CategoryColors
  *Block.* Specifies display colours for the categorical states of this property.
  Each key in the block links a possible value of the property to a color (example: ``Accepted: rgb(0,192,0)``).
  The special value ``_other_`` can be used to specify a color for all other property values that are not listed explicitly.

MaxColumnWidth
  *Value.* Specifies the maximum width (in pixels) used for the column representing this property in a table view.
  Longer text will be abbreviated with ellipsis.

BarWidth
  *Value*. Draws a bar in the background of the table, indicating the value.
  Only applicable to *Value* data types, and requires *MinVal* & *MaxVal* to be defined.

MinVal
  *Value.* For *Value* types, specifies the minimum value that can be reached.

MaxVal
  *Value.* For *Value* types, specifies the maximum value that can be reached.

DecimDigits
  *Value.* For *Value* types, specifies the number of decimal digits used to display the value.

Index
  *Boolean.* If set, instructs Panoptes to create an index for this property in the relational database.
  For large datasets, this massively speeds up queries and sort commands based on this property.

Search
  *Text.* Indicates that this field can be used for text search in the find data item wizard.
  Possible values:

  - ``Match``: only exact matched are searched for.
  - ``StartPattern``: searches all text that starts with the string typed by the user.
  - ``Pattern``: searches all text that contains the string typed by the user.

Relation
  *Block.* Defines a many-to-one foreign relation to a parent data table.
  The parent table should contain a property with the same name as the primary key property in the child table.
  The block can contain the following keys:

    TableId
      *Datatable ID (required).* Data table ID of the relation parent table.
    ForwardName
      *Text (required).* Display name of the relation from child to parent.
    ReverseName
      *Text (required).* Display name of the relation from parent to child.

ReadData
  *Boolean.* If set to false, this property will not be imported from the TAB-delimited source file.

CanUpdate: true
  *Boolean.* If set to true, this property can be modified by the user. (*NOTE: under construction*).

ShowInTable
  *Boolean*. If set, this property will appear by default in data table grids in the application.

ShowInBrowser
  *Boolean.* If set, this property will automatically appear as a track in the genome browser
  (only applies if *IsPositionOnGenome* is specified in database settings).

BrowserDefaultVisible
  *Boolean.* Indicates that the track will activated by default in the genome browser (only applies if *ShowInBrowser* is set).

BrowserShowOnTop
  *Boolean.* Indicates that the track will be shown in the top (non-scrolling) area of the genome browser.
  In this case, it will always be visible (only applies if *ShowInBrowser* is set).

ChannelName
  *Text.* Name of the genome browser track this property will be displayed in.
  Properties sharing the same track name will be displayed in overlay
  (only applies if *ShowInBrowser* is set).

ChannelColor
   *Text.* Colour used to display this property in the genome browser. Formatted as ``"rgb(r,g,b)"``
   (only applies if *ShowInBrowser* is set).

ConnectLines
   *Boolean.* Indicate that the points will be connected with lines in the genome browser
   (only applies if *ShowInBrowser* is set).

SummaryValues
  *Block.* Instructs Panoptes to apply a multiresolution summary algorithm for fast display of this property
  in the genome browser at any zoom level (only applies if *ShowInBrowser* is set). Possible keys in this block:

    BlockSizeMin
      *Value (required).* Minimum summary block size (in bp)
    BlockSizeMax
      *Value (required).* Maximum summary block size (in bp)
    ChannelColor
      *Text.* Colour of the channel. Formatted as ``"rgb(r,g,b)"``.
