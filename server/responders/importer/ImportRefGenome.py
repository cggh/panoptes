from __future__ import print_function
from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os
import uuid
from os.path import join

import errno

from . import ImpUtils
import shutil
from .PanoptesConfig import PanoptesConfig
from .SettingsDAO import SettingsDAO
from .SettingsRefGenome import SettingsRefGenome
import json
from .readChromLengths import readChromLengths
import simplejson
from Bio import SeqIO

def flattenarglist(arg):
    if isinstance(arg, list):
        return ','.join(arg)
    else:
        return arg

def ImportRefGenome(calculationObject, datasetId, sourceFolder, importSettings):
    config = PanoptesConfig(calculationObject)
    baseFolder = join(config.getBaseDir(), 'config', datasetId)
    datasetFolder = join(sourceFolder, datasetId)
    folder = join(datasetFolder, 'refgenome')

    if not os.path.exists(folder):
        return False

    dao = SettingsDAO(calculationObject, datasetId)
            
    with calculationObject.LogHeader('Importing reference genome data'):

        settings = SettingsRefGenome(join(folder, 'settings'), validate=True)
        print('Settings: '+str(settings))

        for token in list(settings.getLoadedSettings().keys()):
            val = settings[token]
            if (type(val) is list) or (type(val) is dict):
                val = json.dumps(val)
            dao.saveSettings(token, val)
        conf = PanoptesConfig(calculationObject)

        # Store chrom lengths from FASTA
        chromosomes = readChromLengths(join(folder, 'refsequence.fa'))
        try:
            os.makedirs(baseFolder)
        except OSError as exception:
            if exception.errno != errno.EEXIST:
                raise
        with open(join(baseFolder, 'chromosomes.json'), 'w') as f:
            simplejson.dump(chromosomes, f)

        # Import reference genome
        if not(importSettings['ConfigOnly']):
            maxBaseCount = slice(0,None)
            if importSettings['ScopeStr'] != 'all':
                maxBaseCount = slice(0,10000)
            if importSettings['ScopeStr'] == '100k':
                maxBaseCount = slice(0,1000000)
            refsequencefile = join(folder, 'refsequence.fa')
            if os.path.exists(refsequencefile):
                with calculationObject.LogHeader('Converting reference genome'):
                    tempFile = join(conf.getBaseDir(), str(uuid.uuid4()))
                    with open(refsequencefile, "rU") as f, open(tempFile, 'w') as o:
                        for record in SeqIO.parse(f, "fasta"):
                            chrom = record.id
                            for i, base in enumerate(record.seq[maxBaseCount]):
                                o.write('\t'.join([chrom, str(i), str(ord(base.lower()))])+'\n')
                dao._execSql('CREATE TABLE "_sequence_" ("chrom" text, "pos" int, "base" tinyint);')
                dao._execSql("COPY INTO _sequence_ from '%s' USING DELIMITERS '\t','\n' NULL AS '' LOCKED" % (tempFile))
                os.remove(tempFile)
            else:
                calculationObject.Log('WARNING: missing reference sequence file')

        # Import annotation
        if not(importSettings['ConfigOnly']):
            with calculationObject.LogHeader('Converting annotation'):
                str_maxrowcount = 'all'
                if importSettings['ScopeStr'] == '1k':
                    str_maxrowcount = '1000'
                if importSettings['ScopeStr'] == '10k':
                    str_maxrowcount = '10000'

                formatid = 'GFF'
                geneidlist = 'gene,pseudogene'
                exonid = 'exon'
                attrib_genename = 'Name'
                attrib_genenames = 'Name,Alias,previous_systematic_id'
                attrib_descr = 'descr'
                if settings['annotation']:
                    annotationsettings = settings['annotation']
                    print('Annotation settings: '+str(annotationsettings))
                    if 'format' in annotationsettings:
                        formatid = annotationsettings['format']
                    if 'geneFeature' in annotationsettings:
                        geneidlist = flattenarglist(annotationsettings['geneFeature'])
                    if 'exonFeature' in annotationsettings:
                        exonid = flattenarglist(annotationsettings['exonFeature'])
                    if 'geneNameAttribute' in annotationsettings:
                        attrib_genename = flattenarglist(annotationsettings['geneNameAttribute'])
                    if 'geneNameSetAttribute' in annotationsettings:
                        attrib_genenames = flattenarglist(annotationsettings['geneNameSetAttribute'])
                    if 'geneDescriptionAttribute' in annotationsettings:
                        attrib_descr = flattenarglist(annotationsettings['geneDescriptionAttribute'])

                tempgfffile = ImpUtils.GetTempFileName()
                temppath = os.path.dirname(tempgfffile)
                shutil.copyfile(join(folder, 'annotation.gff'), tempgfffile)
                ImpUtils.RunConvertor(calculationObject, 'ParseAnnotation', temppath, [
                    str_maxrowcount,
                    formatid,
                    geneidlist,
                    exonid,
                    attrib_genename,
                    attrib_genenames,
                    attrib_descr,
                    os.path.basename(tempgfffile)
                ])
                print('Importing annotation')
                dao.loadFile(join(temppath, 'annotation_dump.sql'))
                os.remove(tempgfffile)
                os.remove(join(temppath, 'annotation.txt'))
                os.remove(join(temppath, 'annotation_dump.sql'))
                os.remove(join(temppath, 'annotation_create.sql'))

    return True

if __name__ == "__main__":
    import sys
    import responders.asyncresponder as asyncresponder

    datasetId = sys.argv[1]
    importSettings = {
                'ConfigOnly': False,
                'ScopeStr': 'all',
                'SkipTableTracks': 'true'
            }
    calculationObject = asyncresponder.CalculationThread('', None, {'isRunningLocal': True}, '')
    DQXDbTools.DbCredentialVerifier = None
    conf = PanoptesConfig(calculationObject)
    sourceFolder = join(conf.getSourceDataDir(), 'datasets')
    ImportRefGenome(calculationObject, datasetId, sourceFolder, importSettings)
