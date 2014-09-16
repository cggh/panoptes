
.. _dataconcept_dataitem:

Data item
.........
A *data item* is an individual record in a :ref:`data table<dataconcept_datatable>`.
It has a number of :ref:`properties<dataconcept_property>`, defined by columns in the *data table*.
For example, it may correspond to an individual sample, or an individual variant.

On a running Panoptes instance, it is possible to format a url that creates a deep link into a view showing information about an individual data item:

``[BaseUrl]?dataset=[DatasetId]&workspace=[WorkspaceId]&tableid=[TableId]&itemid=[DataItemId]``

If the server only serves a single data set, the ``dataset`` token may be omitted. If the dataset contains only a single workspace, the ``workspace`` token may be omitted.