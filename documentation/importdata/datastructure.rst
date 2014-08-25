Panoptes data structure
-----------------------
Basic concepts
~~~~~~~~~~~~~~
The data served by Panoptes is structured according to a number of central concepts.

Dataset
.......
A complete set of data that can be loaded and visualized in a single Panoptes session.
A dataset can consist of:

- A set of *data tables*.
- A *reference genome*, including annotation.
- A set of *summary values*, defined on the reference genome.
- *Genotype data*.
- Various settings that define the structure of these components, and the interactions between them.

Workspace
.........
Each *dataset* has one or more *workspaces* associated. The user always opens a specific *workspace*,
and can add custom information to the *dataset* that is only visible in the context of this *workspace*.
In addition, certain entities, such as stored queries, are specific to an individual *workspace*.

Data table
..........
A *data table* is a table of records that can be queried and visualized in Panoptes, and corresponds
to a type of information. Examples of *data tables* are **samples** and **genomic variants**.
A record in a *data table* is called a *data item*. Each *data table* has a number of columns
called *properties*.

Data item
.........
A *data item* is an individual record in a *data table*. For example, it may correspond to a single sample,
or a single variant.

Property
........
A *property* is a column in a *data table*. As such, it defines a property of a *data item*. Examples are collection dates and geographical coordinates for samples.
There are two types of properties:

- **Standard property**: provided in the *dataset*. These are visible in every *workspace*.
- **Custom property**: specified at the level of a *workspace*.

Reference genome
................
A *dataset* can have information that relates to a *reference genome*, such a genomic variants.
In Panoptes, the reference genome can be defined using a *reference sequence* and an *annotation*.

Summary value
.............
A *summary value* is a filterbanked property defined over a reference genome. There are three types:

- **Standard summary value**: provided in the *dataset*.
- **Custom summary value**: specified at the level of a *workspace*.
- **Data table - related summary value**: a type of *summary value* that has an instance for each *data item* in a *data table*. Example: sequencing coverage info for samples with sequenced genomes.

Genotype data
.............
@@TODO.
