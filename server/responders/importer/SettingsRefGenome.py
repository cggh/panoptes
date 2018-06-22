# -*- coding: utf-8 -*-
from __future__ import print_function
from ImportSettings import ImportSettings
from collections import OrderedDict

class SettingsRefGenome(ImportSettings):
    
    def getSettings(self):
        refGenomeSettings = OrderedDict((
                         ('annotation', {
                                        'type': 'Block',
                                        'required': False,
                                        'description': 'Directives for parsing the annotation file (annotation.gff)',
                                        'children': OrderedDict((
                                                     ('format', {
                                                                'type': 'Text',
                                                                'description': '''File format. Possible values
        GFF = Version 3 GFF file
        GTF = Version 2 GTF file

'''
                                                                }),
                                                     ('geneFeature', {
                                                                     'type': 'Text or List',
                                                                     'description': 'Feature id(s) used to identify genes.\n  Example: [gene, pseudogene]'
                                                                     }),
                                                     ('exonFeature', {
                                                                     'type': 'Text or List',
                                                                     'description': 'Feature id(s) used to identify exons'
                                                                     }),
                                                     ('geneNameAttribute', {
                                                                     'type': 'Text',
                                                                     'description': 'Attribute id used to identify gene names'
                                                                     }),
                                                     ('geneNameSetAttribute', {
                                                                     'type': 'Text or List',
                                                                     'description': 'Attribute id(s) used to identify gene name sets.\n  Example: [Name,Alias]'
                                                                     }),
                                                     ('geneDescriptionAttribute', {
                                                                     'type': 'Text or List',
                                                                     'description': 'Attribute id(s) used to identify gene descriptions'
                                                                     })
                                                     
                                                     ))
                                        }),
                          ('externalGeneLinks' , {
                                   'type': 'List',
                                   'required': False,
                                   'default': [],
                                   'description': '''Each item in the list specifies a link for a gene to an external url.
  These links will show up as buttons in the gene popup window''',
                                   'children': OrderedDict((
                                                ('url', {
                                                        'type': 'Text',
                                                        'required': True,
                                                        'description': '''Url for this link.
      This may include a token ``{Id}`` to refer to the unique gene identifier.
      Example: ``https://www.google.co.uk/search?q={Id}``'''
                                                        }),
                                                ('name', {
                                                        'type': 'Text',
                                                        'required': True,
                                                        'description': 'Display name for this external link'
                                                        })
                                                ))
                                })
                         ))
    
        return refGenomeSettings

    def _getDocHeader(self):
        return '''.. _YAML: http://www.yaml.org/about.html

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

'''
        
    def _getDocFilename(self):
        return 'documentation/importdata/importsettings/refgenome.rst'
    