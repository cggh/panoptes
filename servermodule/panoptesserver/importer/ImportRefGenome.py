# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import DQXDbTools
import DQXUtils
import config
from DQXTableUtils import VTTable
import SettingsLoader
import ImpUtils
import shutil
import customresponders.panoptesserver.Utils as Utils
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
from DQXDbTools import DBDBESC
import sys

def flattenarglist(arg):
    if isinstance(arg, list):
        return ','.join(arg)
    else:
        return arg

def ImportRefGenomeSummaryData(calculationObject, datasetId, folder, importSettings):
    if not os.path.exists(os.path.join(folder, 'summaryvalues')):
        return

    maxLineCount = -1
    if importSettings['ScopeStr'] == '1k':
        maxLineCount = 1000
    if importSettings['ScopeStr'] == '10k':
        maxLineCount = 10000
    if importSettings['ScopeStr'] == '100k':
        maxLineCount = 100000
    if importSettings['ScopeStr'] == '1M':
        maxLineCount = 1000000
    if importSettings['ScopeStr'] == '10M':
        maxLineCount = 10000000

    calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, 'summaryvalues'))

    summaryids = []
    for dir in os.listdir(os.path.join(folder, 'summaryvalues')):
        if os.path.isdir(os.path.join(folder, 'summaryvalues', dir)):
            summaryids.append(dir)
    for summaryid in summaryids:
        with calculationObject.LogHeader('Importing reference genome summary data '+summaryid):
            DQXUtils.CheckValidColumnIdentifier(summaryid)
            destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', datasetId, summaryid)
            if not os.path.exists(destFolder):
                os.makedirs(destFolder)
            dataFileName = os.path.join(destFolder, summaryid)
            shutil.copyfile(os.path.join(folder, 'summaryvalues', summaryid, 'values'), dataFileName)

            settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'summaryvalues', summaryid, 'settings'))
            settings.RequireTokens(['Name', 'MaxVal', 'MaxVal', 'BlockSizeMax'])
            settings.AddTokenIfMissing('MinVal', 0)
            settings.AddTokenIfMissing('BlockSizeMin', 1)
            settings.AddTokenIfMissing('ChannelColor', 'rgb(0,0,0)')
            settings.AddTokenIfMissing('Order', 99999)
            settings.DefineKnownTokens(['channelColor'])
            settings.AddTokenIfMissing('ScopeStr', importSettings['ScopeStr'])
            print('SETTINGS: '+settings.ToJSON())
            if not(importSettings['ConfigOnly']):
                print('Executing filter bank')
                ImpUtils.ExecuteFilterbankSummary_Value(calculationObject, destFolder, summaryid, settings, maxLineCount)
            else:
                calculationObject.Log('WARNING: Skipping filterbanking genome summary data')
            extraSettings = settings.Clone()
            extraSettings.DropTokens(['Name', 'Order', 'MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax'])
            sql = "INSERT INTO summaryvalues VALUES ('', 'fixed', '{0}', '-', '{1}', {2}, '{3}', {4}, {5}, {6})".format(
                summaryid,
                settings['Name'],
                settings['Order'],
                extraSettings.ToJSON(),
                settings['MinVal'],
                settings['MaxVal'],
                settings['BlockSizeMin']
            )
            ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)



def ImportRefGenome(calculationObject, datasetId, folder, importSettings):
    with calculationObject.LogHeader('Importing reference genome data'):

        ImportRefGenomeSummaryData(calculationObject, datasetId, folder, importSettings)

        settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'settings'))
        settings.DefineKnownTokens(['AnnotMaxViewportSize', 'RefSequenceSumm'])
        print('Settings: '+str(settings.Get()))
        ImpUtils.ImportGlobalSettings(calculationObject, datasetId, settings)

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
                    destfolder = config.BASEDIR + '/SummaryTracks/' + datasetId + '/Sequence'
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
            ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DELETE FROM chromosomes')
            ImpUtils.ExecuteSQLScript(calculationObject, sqlfile, datasetId)
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
                if settings.HasToken('Annotation'):
                    annotationsettings = settings.GetSubSettings('Annotation')
                    print('Annotation settings: '+str(annotationsettings.Get()))
                    if annotationsettings.HasToken('Format'):
                        formatid = annotationsettings['Format']
                        if formatid not in ['GFF', 'GTF']:
                            raise Exception('Invalid annotation format (should be GTF or GFF')
                    if annotationsettings.HasToken('GeneFeature'):
                        geneidlist = flattenarglist(annotationsettings['GeneFeature'])
                    if annotationsettings.HasToken('ExonFeature'):
                        exonid = annotationsettings['ExonFeature']
                    if annotationsettings.HasToken('GeneNameAttribute'):
                        attrib_genename = flattenarglist(annotationsettings['GeneNameAttribute'])
                    if annotationsettings.HasToken('GeneNameSetAttribute'):
                        attrib_genenames = flattenarglist(annotationsettings['GeneNameSetAttribute'])
                    if annotationsettings.HasToken('GeneDescriptionAttribute'):
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
                ImpUtils.ExecuteSQLScript(calculationObject, os.path.join(temppath, 'annotation_dump.sql'), datasetId)
                os.remove(tempgfffile)
                os.remove(os.path.join(temppath, 'annotation.txt'))
                os.remove(os.path.join(temppath, 'annotation_dump.sql'))
                os.remove(os.path.join(temppath, 'annotation_create.sql'))

