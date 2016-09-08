.. _def-settings-datatable-properties:

Datatable property settings
^^^^^^^^^^^^^^^^^^^^^^^^^^^
An overview of the possible keys than can be defined for an individual property in
the *Properties* block of the data table settings.

id
  *Text (required).* Identifier of the property, equal to the corresponding column header in the TAB-delimited source file ``data``.

dataType
  *Text (required).* Data type of the values in the property.
  Possible values:

  - ``Text``: text strings.
  - ``Value``: numerical values (integer of decimal; the distinction is made by the key *DecimDigits*).
    Absent values can be coded by an empty string, "NA", "None", "NULL", "null", "inf" or "-".
  - ``HighPrecisionValue``: same as ``Value``, with higher precision.
  - ``Boolean``: Yes/No binary states. Possible values according to YAML: y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF.
    Absent values are coded by an empty string.
  - ``GeoLongitude``: longitude part of a geographical coordinates (in decimal degrees).
    Absent values are coded by an empty string.
  - ``GeoLatitude``: latitude part of a geographical coordinates (in decimal degrees).
    Absent values are coded by an empty string.
  - ``Date``: calendar dates, ISO formatted (i.e. YYYY-MM-DD).
    Absent values are coded by an empty string.

name
  *Text (required).* Display name of the property.

description
  *Text.* Brief description of the property.
  This will appear in hover tool tips and in the popup box if a user clicks a property info button.

groupId
  *Text.* Id of the Property group this property belongs to.

externalUrl
  *Text.* A url that should be opened when the user clicks on a value of this property. The url should
  be formatted as a template, with ``{value}`` interpolated to the property value.
  For example: ``http://www.ebi.ac.uk/ena/data/view/{value}``.

isCategorical
  *Boolean.* Instructs Panoptes to treat the property as a categorical variable.
  For example, a combo box with the possible states is automatically shown in queries for this property.
  Categorical properties are automatically indexed.

categoryColors
  *Block.* Specifies display colours for the categorical states of this property.
  Each key in the block links a possible value of the property to a color (example: ``Accepted: rgb(0,192,0)``).
  The special value ``_other_`` can be used to specify a color for all other property values that are not listed explicitly.

defaultWidth
  *Value.* Sets the deafult column width in pixels.(only applies if *dataType* is ['Value', 'HighPrecisionValue']).

showBar
  *Boolean.* Draws a bar in the background of the table, indicating the value.
  Requires *minVal* & *maxVal* to be defined.(only applies if *dataType* is ['Value', 'HighPrecisionValue']).

minVal
  *Value.* For *Value* types, upper extent of scale(only applies if *dataType* is ['Value', 'HighPrecisionValue']).

maxVal
  *Value.* For *Value* types, lower extent of scale(only applies if *dataType* is ['Value', 'HighPrecisionValue']).

maxLen
  *Value.*  Default:0.  If present used to specify the maximum size of the database column - otherwise it is calculated.

decimDigits
  *Value.* For *Value* types, specifies the number of decimal digits used to display the value(only applies if *dataType* is ['Value', 'HighPrecisionValue']).

maxDecimDigits
  *Value.* (Not currently used) For *Value* types, specifies the number of decimal digits used to store the value in the database(only applies if *dataType* is ['Value', 'HighPrecisionValue']).

index
  *Boolean.*  Default:False.  If set, instructs Panoptes to create an index for this property in the relational database.
  For large datasets, this massively speeds up queries and sort commands based on this property.

search
  *Text.*  Default:None.  Indicates that this field can be used for text search in the find data item wizard.
  Possible values:

  - ``None``: .
  - ``Match``: only exact matched are searched for.
  - ``StartPattern``: searches all text that starts with the string typed by the user.
  - ``Pattern``: searches all text that contains the string typed by the user.

relation
  *Block.* Defines a many-to-one foreign relation to a parent data table.
  The parent table should contain a property with the same name as the primary key property in the child table.
  The block can contain the following keys:
    tableId
      *DatatableID (required).* Data table ID of the relation parent table.

    forwardName
      *Text (required).*  Default:belongs to.  Display name of the relation from child to parent.

    reverseName
      *Text (required).*  Default:has.  Display name of the relation from parent to child.

canUpdate
  *Boolean.*  Default:False.   If set to true, this property can be modified by the user. (*NOTE: under construction*).

showInTable
  *Boolean.*  Default:True.  If set to false this property will not be available to be shown in tables in the application.

showInBrowser
  *Boolean.*  Default:False.  If set, this property will automatically appear as a track in the genome browser
  (only applies if *IsPositionOnGenome* is specified in database settings).

tableDefaultVisible
  *Boolean.*  Default:True.  If set to true (default) then this property will appear in tables when they are first shown.

browserDefaultVisible
  *Boolean.* Indicates that the track will activated by default in the genome browser (only applies if *showInBrowser* is True).

browserShowOnTop
  *Boolean.* Indicates that the track will be shown in the top (non-scrolling) area of the genome browser.
  In this case, it will always be visible (only applies if *showInBrowser* is True).

channelColor
  *Text.*  Default:rgb(0,0,0).  Colour used to display this property in the genome browser. Formatted as ``"rgb(r,g,b)"``
  (only applies if *showInBrowser* is True).

connectLines
  *Boolean.*  Default:False.  Indicate that the points will be connected with lines in the genome browser
  (only applies if *showInBrowser* is True).

defaultVisible
  *Boolean.*  Default:True.  .

order
  *Value.*  Default:-1.  Only used for reference genome tracks.

summaryValues
  *Block.* Instructs Panoptes to apply a multiresolution summary algorithm for fast display of this property
  in the genome browser at any zoom level(only applies if *showInBrowser* is True).
  The block can contain the following keys:
    blockSizeMin
      *Value.*  Default:1.  Minimum summary block size (in bp).

    blockSizeMax
      *Value (required).* Maximum summary block size (in bp).

    channelColor
      *Text.*  Default:rgb(0,0,180).  Colour of the channel, for numerical channels. Formatted as ``"rgb(r,g,b)"``.

    maxDensity
      *Value.* For categorical properties this set the scale for the summary track in rows/bp. Defaults to 1/bp.


