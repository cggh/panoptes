Introduction
============
Panoptes is a web application for exploration and visualisation of data. It was created by the `CGGH
<http://www.cggh.org/>`_ software development team to assist with the visualisation of various types of data created by the project. It has a strong focus on population genetics data, but most of its tools are generic and can be used on a wide range of data.

List of basic features
----------------------

Table viewer
  A cornerstone element of Panoptes is a paged table viewer that can serve tables of unlimited size.
  
Query builder
  Panoptes contains a graphical and interactive query builder that allows the user to create advanced queries in a simple, intuitive way. This query tool automatically hooks up to any other component of the software, such as the table viewer or the charting tools.
   
Charts
  The software contains a variety of chart visualisations, such as histograms, bar graphs, scatter plots, etc... . These charts are highly interactive, including colour overlays, tool tips, popups, and selection tools.
  
Geospatial and geotemporal visualisations
  A specific subset of charts deals with interactive visualisation of data points on a map, potentially combined with a time line.
  
Genome browser
  Data points that correspond to positions or regions on a genome (such as SNPs or other variants) can be visualised on a genome browser. Numerical properties can be shown as graphics tracks in that browser. An powerful feature of Panoptes is the concept of multiresolution data summarisation, which allows the browser to show properties over the genome in real-time, regardless the zoom level or genome size. 
  
Genotype browser
  @TODO.
  
Visual Analytics
  Panoptes implements some basic concepts of Visual Analytics, offering near-realtime visualisations with a high level of interactivity, and extensive selection methods that can be used to drill down in the dataset.
    
Data sharing
  One of the fundamental design goals of the application is to serve as a data sharing tool and a collaborative platform between a group of scientists working on a common dataset. As an example, every visualisation that can be created in Panoptes, can be turned into a permanent link, ready to be shared by other users.
  
Data import
  Panoptes offers an easy and flexible data import path. It can grab source data from simple, TAB-delimited source files, augmented by settings files containing metadata that instruct the software how to treat these data. 