Quality Assured Features (QAFs)
===============================

Contents:
- About this software
- Compatibility
- Features

____________________________________________

About this software
-------------------

- Name: Panoptes
- Type: web application
- Version: v2.0.beta4

Please note:
- the following assertions of software compatibility and features only relate to the version specified above;
- the [Panoptes GitHub site](https://github.com/cggh/panoptes/issues) tracks server and client compatibility issues.

Compatibility
-------------

### Server operating systems:
- [x] Canonical Ubuntu Server 16.04.5 LTS (Xenial Xerus), 18.04.1 (Bionic Beaver)
- [x] Debian GNU/Linux 9 (stretch)

### Client operating systems:
- desktop and laptop
  - [x] Canonical Ubuntu Desktop 14.04, 16.04, 18.04
  - [ ] Microsoft Windows 7, 8.1, 10
  - [ ] Apple Mac OS X 10.10, Mac OS X El Capitan, macOS Sierra, macOS High Sierra
- tablet and mobile
  - [ ] Apple iOS 10.3, 11.2, 11.3, 11.4
  - [ ] Google Android 5.1 Lollipop, 6.0 Marshmallow, 7.0 Nougat, 8.0 Oreo

### Client web browsers (minimum versions):
- desktop and laptop
  - Canonical Ubuntu Desktop 12.04, 14.04, 16.04
    - [ ] Google Chrome v29 (latest v54) (expected to work, tests pending, v54 OK)
    - [ ] Mozilla Firefox v25 (latest v49) (expected to work, tests pending, v49 OK)
    - [ ] Opera v16 (latest v41) (expected to work, tests pending, v39 OK)
  - Microsoft Windows 10
    - [x] Microsoft Edge v13 (latest v14)
  - Microsoft Windows 7, 8, 8.1, 10
    - [x] Google Chrome v29 (latest v54)
    - [x] Mozilla Firefox v25 (latest v49)
    - [x] Microsoft Internet Explorer v11 (latest v11)
    - [x] Opera v16 (latest v41)
  - Apple Mac OS X 10.10, Mac OS X 10.11, macOS 10.12
    - [x] Apple Safari v9 (WebKit v601) (latest v10, WebKit v602)
    - [x] Google Chrome v29 (latest v54)
    - [x] Mozilla Firefox v25 (latest v49)

### Compatible-pending client web browsers (minimum versions):
- tablet and mobile
  - Apple iOS v10
    - [ ] Google Chrome v29 (latest v54) (preliminary tests suggest OK)
    - [ ] Apple Safari for Apple iOS v10 (preliminary tests suggest OK)
  - Google Android v7
    - [ ] Google Chrome for Google Android v53 (preliminary tests suggest OK)
    - [ ] UC Browser for Android v11 (tests pending)
    - [ ] Opera Mobile v37 (tests pending)  
    - [ ] Android Browser v13 (tests pending)
    - [ ] Samsung Internet v4 (tests pending)


### Incompatible client web browsers (maximum versions):
- desktop and laptop
  - Ubuntu Desktop 16.04
    - Google Chrome v28 (released 2013-07-09) (expected to fail: layout)
    - Mozilla Firefox v24 (released 2014-06-10) (expected to fail: `TypeError: set.forEach is not a function`)
    - Opera v15 (released 2013-05-28) (expected to fail: layout)
  - Microsoft Windows 8.1
    - Google Chrome v28 (released 2013-07-09) (known to fail: layout)
    - Mozilla Firefox v24 (released 2014-06-10) (known to fail: `TypeError: set.forEach is not a function`)
  - Microsoft Windows 8
    - Microsoft Internet Explorer v10 (released 2012-10-26) (known to fail: `'Uint8ClampedArray' is undefined `)
    - Opera v15 (released 2013-05-28) (known to fail: layout)
  - Microsoft Windows XP (mainstream support ended 2009-04-14)
  - Apple Mac OS X 10.10 "Yosemite", Mac OS X 10.11 "El Capitan", macOS 10.12 "Sierra"
    - Google Chrome v44 (released 2015-07-22) (known to fail)
    - Mozilla Firefox v24 (released 2013-05-14) (expected to fail)
  - Apple Mac OS X 10.9 "Mavericks" (mainstream support ended 2016-09)
- tablet and mobile
  - Apple iOS v10
    - Google Chrome v28 (released 2013-07-09) (expected to fail: layout)

____________________________________________

Features
--------

For the compatible platforms, the following features of the specified release have been verified:

(You can:)

### As an end-user of the software

#### Panoptes Content (a mixture of HTML markup, CSS and rendered **React components**)
- [x] see **Panoptes Content** in a **Panoptes Tab** or **Panoptes Pop-up**
- [x] click a link within **Panoptes Content** to open other **Panoptes Content** in a **Panoptes Tab**
- [x] click a button within **Panoptes Content** to open a **Table Plot** in a **Panoptes Pop-up**
- [x] click a button within **Panoptes Content** to open a **Table Map** in a **Panoptes Pop-up**
- [x] click a button within **Panoptes Content** to open a **Table Tree** in a **Panoptes Pop-up**

#### Panoptes Tab/Pop-up
- [x] open any number of views, in different **Panoptes Tabs**
- [x] close any **Panoptes Tab** except those fixed by configuration
- [x] convert any **Panoptes Tab** (except fixed tabs) into a **Panoptes Pop-up**, i.e. undock a tab
- [x] convert any **Panoptes Pop-up** into a **Panoptes Tab**, i.e. dock a pop-up
- [x] close any **Panoptes Pop-up**
- [x] move any **Panoptes Pop-up**
- [x] resize any **Panoptes Pop-up**

#### Actions Panel
- [x] shrink and expand the **Actions Panel**

#### Gene Finder
- [x] list genes that contain a specific text string within their names or descriptions
- [x] list genes that are located between specific positions on a specific chromosome
- [x] list genes that have been clicked on during the session
- [x] see the **Gene Information** for any listed gene (by clicking on it)


#### Gene Information
- [x] see the reference sequence for a gene
- [x] see the coding sequence structure for a gene
- [x] see the position for a gene
- [x] see the description for a gene
- [x] see the alternative names for a gene
- [x] see a gene in the **Genome Browser**

#### Dataset Manager
- [x] import a dataset (administators only)
- [x] re-import a dataset (administators only)
- [ ] reload a dataset's configuration (administators only)
- [x] see the list of dataset import status logs (administators only)
- [x] see the contents of a dataset import status log (administators only)

#### Genome Browser

##### Channel Picker
- [x] see the list of channels that can be added, grouped by **Property Group**
- [x] specify a text string to search for in the list of available channels
- [x] search the list of available channels for a specified text string
- [x] select multiple available channels
- [x] add multiple selected channels to the **Genome Browser**
- [x] remove a channel from the **Genome Browser**

##### Channel Viewer
- [x] add a filter to a ?type channel
- [x] colour ? on a ?type channel
- [x] auto-scale the Y-axis on a ?type channel
- [x] specify minimum and maximum values for the Y-axis on a ? type channel
- [x] convert ? to fractional on a ?type channel
- [x] see the list of chromosomes for the reference genome (configuration)
- [x] select a chromosome from the list of chromosomes
- [x] see the selected chromosome
- [x] see the **Reference Sequence Channel** for the selected chromosome
- [x] see the **Genes Channel** for the selected chromosome
- [x] specify the view midpoint position for the selected chromosome
- [x] specify the view width (in bases) for the selected chromosome  
- [x] see the current view position region as `[chromosome]:[start]-[end]`
- [x] store (save) the current set of channels (administators only)
- [x] delete a stored (saved) set of channels (administators only)
- [x] select a set of stored (saved) channels
- [x] save a set of visible channels as a **Channel Set**, specifying a name and description (administrators only)
- [x] delete a saved **Channel Set** (administrators only)

###### Reference Sequence Channel
- [x] see the summarized bases by colour for all of the bases within the current view
- [x] see the legend enumerating the colours used for each base in the reference sequence
- [x] see the current view position in base numbers for the selected chromosome

###### Genes Channel
- [x] see the coding sequence legend for the **Genes Channel**
- [x] see the **Gene Information** for any visible gene (by clicking on it)

#### Table Plotter
- [x] select an imported data table for the plot data
- [x] apply a **Filter** to the imported table data
- [x] select a plot type from: bar; histogram; 2D histogram; box and whisker; and scatter
- [x] select which columns of the selected data table to use for the each plot dimension

#### Map Composer
- [x] select an imported data table for the map data
- [x] apply a **Filter** to the imported table data
- [x] select a base tile layer for the map
- [x] select an overlay tile layer for the map
- [x] select an overlay image layer for the map
- [x] see the template code for the map (administrators only)

#### Tree Plotter
- [x] select an imported data table for the tree data
- [x] select a tree layout from: rectangular; circular; radial; diagonal; and hierarchical
- [x] select a tree (from options that depend on tree data configuration)
- [x] select a data table column for the tree node colours
- [x] select a data table column for the tree branch colours


#### Table Data Viewer
- [x] collapse and expand the **Actions Panel**
- [x] view the data of an imported data table as a table
- [x] apply a **Filter** to the imported table data
- [x] see the **Filter** that is being applied to the data
- [x] see the **Search** that is being applied to the data
- [x] see the **Sort** that is being applied to the data
- [x] see the total number of rows of data
- [x] see the total number of columns of data
- [x] see as many rows of data as the viewport's height allows
- [x] see the ordinal range of rows being shown
- [x] see the cardinal number of columns being shown
- [x] page through the tabular data
- [x] sort the data of an imported table by multiple columns ascending/descending
- [x] add/remove columns from the view of imported table data
- [x] search columns specified by configuration for a specific text string
- [x] download all rows of the current data view (inc. sorting, etc.) as plain text
- [x] open a **Pivot Table** view of an imported table
- [x] open a **Plot Table** view of an imported table
- [x] open a **Data Item Views** view for any foreign key value (related by configuration)


#### Filter
- [x] select and apply no filter to the **Table Data Viewer**, **Table Plotter**, ...
- [x] select and apply the default filter to the **Table Data Viewer**, **Table Plotter**, ...
- [x] select and apply a stored filter to the **Table Data Viewer**, **Table Plotter**, ...
- [x] add a criterion to a filter
- [x] remove a criterion from a filter
- [x] specify each criterion by selecting a table column and a relational operator, and specifying a value or set of values.
- [x] combine criteria using the Boolean operators AND and OR
- [x] set the default filter (administrators only)
- [x] store the selected filter (administrators only)
- [x] delete a stored filter (administrators only)
- [x] see the JSON representation of the selected filter (administrators only)

#### Pivot Table
- [x] select a column of the selected data table for the column axis of the pivot table
- [x] select a column of the selected data table for the row axis of the pivot table
- [x] filter the data of the selected data table using the **Filter**
- [x] sort the data of the selected data table by multiple columns ascending/descending

#### Data Item List (for a data table)
- [x] see the list of all primary key values for the data table
- [x] select a primary key value from the list of primary key values
- [x] see which primary key value has been selected
- [x] see the **Data Item View** for the selected primary key value
- [x] specify a text string to search for in the list of primary key values
- [x] filter the list of primary key values to those that match the specified text string

#### Data Item View (for a data item)

##### Field List (in the Data Item View) (for a data item)
- [x] see a list of fields (data table column display names and their display values) for the data item (data table record), as configured
- [x] see a description for each data table column, where configured
- [x] see a description for each data table column value, where configured
- [x] see the display name of the **Field List**, as configured

##### Property Group (in the Data Item View) (for a data item)
- [x] see a list of fields (data table column display names and their display values) for the data item (data table record) belonging to a property group, as configured
- [x] see a description for each data table column, where configured
- [x] see a description for each data table column value, where configured
- [x] see the display name of the **Property Group**, as configured

##### Pie Chart Map (in the Data Item View) (for a data item)
- [x] see a map with pie charts, as configured
- [x] see the display name of the **Pie Chart Map**, as configured

##### Overview (in the Data Item View) (for a data item)
- [x] see a list of all the visible fields (data table column display names and their display values) for the data item (data table record)
- [x] see a description for each data table column, where configured
- [x] see a description for each data table column value, where configured
- [x] see the display name of the **Overview**, as configured

#### Template (in the Data Item View) (for a data item)
- [x] see a **Document** (a rendered mixture of HTML markup, CSS and React components) for the data item (data table record), as configured
- [x] see the display name of the **Template**, as configured



____________________________________________


### As an administrator of the software

#### Application configuration
- [x] host multiple datasets using different URL paths

#### Panoptes Content configuration
- [x] source the **Panoptes Content** for a **Panoptes Tab** or **Panoptes Pop-up** from a single file
- [x] include React components within **Panoptes Content** using JSX syntax
- [x] specify the **Panoptes Content** for the first, selected, unclosable tab

#### Dataset configuration
- [x] specify the display name for a dataset
- [x] provide a **First Tab** document template
- [x] set an initial application state
- [x] specify the list order for data tables

#### Table configuration
- [x] specify the singular display name for a data table, e.g. variant
- [x] specify the plural display name for a data table, e.g. variants
- [x] specify the description for a data table
- [x] specify the *Font Awesome* icon for a data table, e.g. fa-bookmark
- [x] specify which data table column to use as the primary key for a data table
- [x] specify which data table column to use to for the default ordering (sort order) of the data table rows (records)
- [x] specify which data table column contains values that are genomic positions
- [x] specify which data table column contains values that are chromosome identifiers
- [x] specify which data table columns to use for **Search** features
- [x] specify whether to display the data table as a **Data Item List**, rather than a **Data Table**

##### Table Property (column, field) configuration (for a data table)
- [x] specify a display name for a data table column (property, field)
- [x] specify a description for a data table column (property, field)
- [x] specify the **Data Type** for a data table column (property, field) as one of: {Text, Int8, Int16, Int32, Float, Boolean, ...}
- [x] specify a **Search Matching Mode** for a data table column (property, field) as one of: {StartPattern, Pattern, Match}
- [x] specify whether a data table column (property, field) is included by default in the **Table Data** view
- [x] specify whether the values in a data table column (property, field) should be treated as categorical data
- [x] specify whether a database index should be created for a data table column (property, field)
- [x] specify the number of decimal places to display for the numeric values in a data table column (property, field)
- [x] specify whether a data table column (property, field) can be chosen as a channel in the **Genome Browser** view
- [x] specify whether a data table column (property, field) is shown by default as a channel in the **Genome Browser** view
- [x] specify whether a data table column (property, field) is always visible as a channel in the **Genome Browser** view
- [x] specify whether a data table column (property, field) displays proportional bars for its values in the **Table Data** view
- [x] specify the minimum value for a numeric data table column (property, field)
- [x] specify the maximum value for a numeric data table column (property, field)
- [x] specify the colour for this data table column (property, field) as: {rgb(0,0,0), #000000}
- [x] specify a colour for each specific value in this data table column (property, field) as: {rgb(0,0,0), #000000}
- [x] specify a colour for all unspecified values in this data table column (property, field) as: {rgb(0,0,0), #000000}
- [x] specify a description for each specific value in this data table column (property, field)
- [x] specify a display value for each specific value in this data table column (property, field)
- [x] specify a URL template and hypertext for a hyperlink, where the URL template can reference data table columns

##### Data Item View configuration (for a data table)

###### Field List (Data Item View) configuration (for a data table)
- [x] include a **Field List** tab in the **Data Item View** by specifying which data table column display names and corresponding display values (fields) will be displayed for each data item (data table record) by specifying the id of those data table columns
- [x] specify the display name for a **Field List**

###### Overview (Data Item View) configuration (for a data table)
- [x] include an **Overview** tab in the **Data Item View**, which is a **Field List** of all of the visible data table columns (fields)
- [x] specify the display name for an **Overview**

###### Property Group (Data Item View) configuration (for a data table)
- [x] include a **Property Group** tab in the **Data Item View** for each data item (data table record), which is a **Field List** of a set of data table columns that all have a common specified groupId (property group)
- [x] specify the display name for a **Property Group**

###### Item Map (Data Item View) configuration (for a data table)
- [x] specify the display name for an **Item Map**
- [x] specify the initial zoom level for an **Item Map**

###### Pie Chart Map (Data Item View) configuration (for a data table)
- [x] include a **Pie Chart Map** tab in the **Data Item View**, which is [TODO: describe]
- [x] specify the display name for a **Pie Chart Map**
- [x] specify which data table to use for the map coordinates (location data table)
- [x] specify which column in the location data table contains the label for each pie chart
- [x] specify which column in the location data table determines the relative size of each pie chart
- [x] specify geographic coordinates (longitude and latitude) for the starting centre position of the map
- [x] specify which columns of the data table to use for the pie chart as a string template, where the string template can reference the primary key of the location data table
- [x] specify a display name for each column of the data table being used for the pie charts
- [x] specify a colour for the pie chart as: {rgb(0,0,0), #000000}
- [x] specify a display name for the fraction of pie remaining after deducting all of the component data table column values

###### Template (Data Item View) configuration (for a data table)
- [x] include a **Template** tab in the **Data Item View** for each data item (data table record), which is a rendering of a specified fragment of HTML markup that can include React components via JSX syntax
- [x] specify the display name for a **Template**