.. _YAML: http://www.yaml.org/about.html

.. _def-settings-refgenome:

Reference genome settings
~~~~~~~~~~~~~~~~~~~~~~~~~
This YAML_ file contains settings for the :ref:`reference genome<dataconcept_refgenome>`. See also:

- :ref:`data-import-settings`
- :ref:`data-import-addannotation`
- :ref:`data-import-addrefgenome`
- `Example file
  <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/refgenome/settings>`_

Possible keys
.............


genomeBrowserDescr
  *Text.* Descriptive text that will be displayed in the genome browser section of the main page.

annotMaxViewPortSize
  *Value.* Maximum viewport (in bp) the genome browser can have in order to show the genome annotation track.

refSequenceSumm
  *Boolean.* If set, a summary track displaying the reference sequence with be included in the genome browser.

annotation
  *Block.* Directives for parsing the annotation file (annotation.gff).
  The block can contain the following keys:
    Format
      *Text.* File format. Possible values
        GFF = Version 3 GFF file
        GTF = Version 2 GTF file

.

    geneFeature
      *Text or List.* Feature id(s) used to identify genes.
  Example: [gene, pseudogene].

    exonFeature
      *Text or List.* Feature id(s) used to identify exons.

    geneNameAttribute
      *Text.* Attribute id used to identify gene names.

    geneNameSetAttribute
      *Text or List.* Attribute id(s) used to identify gene name sets.
  Example: [Name,Alias].

    geneDescriptionAttribute
      *Text or List.* Attribute id(s) used to identify gene descriptions.


externalGeneLinks
  *List.* Each item in the list specifies a link for a gene to an external url.
  These links will show up as buttons in the gene popup window.
  The block can contain the following keys:
    url
      *Text (required).* Url for this link.
      This may include a token ``{Id}`` to refer to the unique gene identifier.
      Example: ``https://www.google.co.uk/search?q={Id}``.

    name
      *Text (required).* Display name for this external link.



