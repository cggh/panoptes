Roadmap: future
===============

Collected ideas for future releases.


More developer-friendly REST API for fetching data
--------------------------------------------------

Self-documenting REST API for serving data, with more
developer-friendly URLs and other return formats e.g. JSON.


Plugin framework
----------------

Implement and document a framework for extending functionality in the
panoptes UI via JavaScript files, which could be provided by a user
alongside data in the shared filesystem.


Generalised support for visualisation and browsing of 2-dimensional array data
------------------------------------------------------------------------------

@@TODO 


Advanced visualisations for genotype data
-----------------------------------------

@@TODO haplotype bifurcation plots

@@TODO LD maps

@@TODO sample sorting by genotype

@@TODO haplotype network


Generalised genome-interval data
--------------------------------

Add support for a table to contain items which are associated with a
genome interval, i.e., there are columns for chromosome, start and
stop position. These data can then be rendered on tracks in the genome
browser. Generalisation of the genes track, to enable support for any
genome interval data, e.g., tandem repeats.


User annotation of data items
-----------------------------

@@TODO


Dataset access control
----------------------

Implement some kind of simple per-dataset role-based access
control. E.g., For each dataset there are two roles, viewer and
controller. Viewers can view all data in the dataset. Controllers can
view all data in the dataset, upload custom data to workspaces, and
perform dataset administration functions (e.g., trigger dataset
imports).

It is assumed that controllers will also have read/write access to the
source data filesystem for the dataset, i.e., controllers are the
people who will be copying files into the filesystem for import and
editing YAML configuration files. However the filesystem access
management will be handled independently of panoptes.

It is assumed that integration with authentication systems and user
role/group management system (e.g., LDAP repository) can be done via
the web container (e.g., Apache), i.e., that the authenticated user ID
and user roles can be obtained by panoptes via something like
environment variables.
