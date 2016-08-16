# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import ImpUtils
import shutil
from ProcessFilterBank import ProcessFilterBank
from PanoptesConfig import PanoptesConfig
from SettingsDAO import SettingsDAO
from SettingsRefGenome import SettingsRefGenome
import json

def flattenarglist(arg):
    if isinstance(arg, list):
        return ','.join(arg)
    else:
        return arg

def ImportRefGenomeSummaryData(calculationObject, datasetId, folder, importSettings):

    filterBanker = ProcessFilterBank(calculationObject, datasetId, importSettings, baseFolder = folder)

    filterBanker.createRefGenomeSummaryValues()


def ImportRefGenome(calculationObject, datasetId, baseFolder, importSettings):
    
    datasetFolder = os.path.join(baseFolder, datasetId)
    folder = os.path.join(datasetFolder, 'refgenome')
    if not os.path.exists(folder):
        return False

    dao = SettingsDAO(calculationObject, datasetId)
            
    with calculationObject.LogHeader('Importing reference genome data'):

        ImportRefGenomeSummaryData(calculationObject, datasetId, baseFolder, importSettings)

        settings = SettingsRefGenome(os.path.join(folder, 'settings'), validate=True)
        print('Settings: '+str(settings))

        for token in settings.getLoadedSettings().keys():
            val = settings[token]
            if (type(val) is list) or (type(val) is dict):
                val = json.dumps(val)
            dao.saveSettings(token, val)

        conf = PanoptesConfig(calculationObject)
        # Import reference genome
        if not(importSettings['ConfigOnly']):
            str_maxbasecount = 'all'
            if importSettings['ScopeStr'] != 'all':
                str_maxbasecount = '10000'
            if importSettings['ScopeStr'] == '100k':
                str_maxbasecount = '1000000'
            refsequencefile = os.path.join(folder, 'refsequence.fa')
            if os.path.exists(refsequencefile):
                with calculationObject.LogHeader('Converting reference genome'):
                    destfolder = conf.getBaseDir() + '/SummaryTracks/' + datasetId + '/Sequence'
                    if not os.path.exists(destfolder):
                        os.makedirs(destfolder)
                    tempfastafile = destfolder + '/refsequence.fa'
                    shutil.copyfile(refsequencefile, tempfastafile)
                    ImpUtils.RunConvertor(calculationObject, 'Fasta2FilterBankData', destfolder, [str_maxbasecount, 'refsequence.fa'])
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
                        exonid = annotationsettings['exonFeature']
                    if 'geneNameAttribute' in annotationsettings:
                        attrib_genename = flattenarglist(annotationsettings['geneNameAttribute'])
                    if 'geneNameSetAttribute' in annotationsettings:
                        attrib_genenames = flattenarglist(annotationsettings['geneNameSetAttribute'])
                    if 'geneDescriptionAttribute' in annotationsettings:
                        attrib_descr = flattenarglist(annotationsettings['geneDescriptionAttribute'])

                tempgfffile = ImpUtils.GetTempFileName()
                temppath = os.path.dirname(tempgfffile)
                shutil.copyfile(os.path.join(folder, 'annotation.gff'), tempgfffile)
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
                dao.loadFile(os.path.join(temppath, 'annotation_dump.sql'))
                os.remove(tempgfffile)
                os.remove(os.path.join(temppath, 'annotation.txt'))
                os.remove(os.path.join(temppath, 'annotation_dump.sql'))
                os.remove(os.path.join(temppath, 'annotation_create.sql'))

    return True

if __name__ == "__main__":


    import sys
    import customresponders.panoptesserver.asyncresponder as asyncresponder

    datasetId = sys.argv[1]
    importSettings = {
                'ConfigOnly': False,
                'ScopeStr': 'all',
                'SkipTableTracks': 'true'
            }
    calculationObject = asyncresponder.CalculationThread('', None, {'isRunningLocal': True}, '')
    DQXDbTools.DbCredentialVerifier = None
    conf = PanoptesConfig(calculationObject)
    baseFolder = os.path.join(conf.getSourceDataDir(), 'datasets')
    ImportRefGenome(calculationObject, datasetId, baseFolder, importSettings)
