.. _YAML: http://www.yaml.org/about.html

Reference genome settings
-------------------------
This YAML_ file contains settings for the :ref:`def-source-referencegenome`, and may contain the following tokens:

GenomeBrowserDescr
  *Text.* Descriptive text that will be displayed in the genome browser section of the main page.

AnnotMaxViewPortSize
  *Value.* Maximum viewport (in bp) the genome browser can have in order to show the annotation track.

RefSequenceSumm
  *Boolean.* If set, a summary track displaying the reference sequence with be included in the genome browser.

Annotation
  *Block.* Directives for parsing the annotation file (annotation.gff).
  Possible member tokens:

  Format
    *Text.* File format. Possible values:
    ``GFF`` = Version 3 GFF file ; ``GTF`` = Version 2 GTF file

  GeneFeature
    *Text or List.* Feature id(s) used to identify genes.
    Example: ``[gene, pseudogene]``.

  ExonFeature
    *Text or List.* Feature id(s) used to identify exons.

  GeneNameAttribute:
    *Text.* Attribute id used to identify gene names

  GeneNameSetAttribute:
    *Text or List.* Attribute id(s) used to identify gene name sets.
    Example: ``[Name,Alias]``.

  GeneDescriptionAttribute
    *Text or List.* description # Attribute id(s) used to identify gene descriptions

ExternalGeneLinks:
  *List.* Each item in the list specifies a link for a gene to an external url.
  These links will show up as buttons in the gene popup window.
  An item in this list should contain the following tokens:

    Url
      *Text (required).*: Url for this link.
      This may include ``{Id}`` to refer to the gene identifier.
      Example: ``https://www.google.co.uk/search?q={Id}``.
    Name:
      *Text (required).* Display name for this external link.
