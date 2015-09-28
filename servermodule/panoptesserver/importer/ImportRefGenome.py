# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
from DQXTableUtils import VTTable
import ImpUtils
import shutil
import customresponders.panoptesserver.Utils as Utils
import sys
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

    dao = SettingsDAO(calculationObject, datasetId, None)
            
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


        # Import chromosomes
        with calculationObject.LogHeader('Loading chromosomes'):
            tb = VTTable.VTTable()
            tb.allColumnsText = True
            try:
                tb.LoadFile(os.path.join(folder, 'chromosomes'))
            except Exception as e:
                raise Exception('Error while reading chromosomes file: '+str(e))
            tb.RequireColumnSet(['chrom', 'length'])
            tb.RenameCol('chrom','id')
            tb.RenameCol('length','len')
            tb.ConvertColToValue('len')
            with calculationObject.LogDataDump():
                tb.PrintRows(0, 99)
            sqlfile = ImpUtils.GetTempFileName()
            tb.SaveSQLDump(sqlfile, 'chromosomes')
            dao.deleteChromosomes()
            dao.loadFile(sqlfile)
            os.remove(sqlfile)

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
                if settings['Annotation']:
                    annotationsettings = settings['Annotation']
                    print('Annotation settings: '+str(annotationsettings))
                    if 'Format' in annotationsettings:
                        formatid = annotationsettings['Format']
                    if 'GeneFeature' in annotationsettings:
                        geneidlist = flattenarglist(annotationsettings['GeneFeature'])
                    if 'ExonFeature' in annotationsettings:
                        exonid = annotationsettings['ExonFeature']
                    if 'GeneNameAttribute' in annotationsettings:
                        attrib_genename = flattenarglist(annotationsettings['GeneNameAttribute'])
                    if 'GeneNameSetAttribute' in annotationsettings:
                        attrib_genenames = flattenarglist(annotationsettings['GeneNameSetAttribute'])
                    if 'GeneDescriptionAttribute' in annotationsettings:
                        attrib_descr = flattenarglist(annotationsettings['GeneDescriptionAttribute'])

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
