.. _def-source-referencegenome:

Reference genome source files
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
A :ref:`dataset source folder<def-source-dataset>` may optionally contain a subfolder ``refgenome``,
describing the :ref:`reference genome<dataconcept_refgenome>` used. It can contain the following files:

- ``chromosomes`` (required). A list of all chromosomes identifiers, and their lengths (in MB).
- ``annotation.gff`` (required). The annotation of the reference genome, in GFF format.
- ``refsequence.fa`` (optional). The reference genome sequence, as FASTA file.
- ``settings`` (required, yaml formatted). Various settings concerning the reference genome (see :ref:`def-settings-refgenome`).

Summary values source files
...........................
The ``refgenome`` folder may contain an optional subfolder ``summaryvalues``.
Each subfolder in this folder represents a different (numerical) property defined over the genome
that will be filter banked and can be displayed in the genome browser.
The folder name serves as the identifier of the summary value. Each summary value folder should contain the following two files:

- ``values``. A TAB-delimited file having three columns,and no header (`example file <https://raw.githubusercontent.com/cggh/panoptes/master/sampledata/datasets/Samples_and_Variants/refgenome/summaryvalues/Uniqueness/values>`_):

   - column 1: Chromosome identifier
   - column 2: Position
   - column 3: Value

- ``settings`` (yaml formatted). Contains the displayed name of the summary value, and further guidelines on how to process the information
  (`example file <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/refgenome/summaryvalues/Uniqueness/settings>`_).

See also:

- :ref:`dataconcept_refgenome`
- :ref:`def-source-data`