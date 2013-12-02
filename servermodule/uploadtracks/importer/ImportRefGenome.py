import os
import DQXDbTools
import DQXUtils
import config
import customresponders.uploadtracks.VTTable as VTTable
import SettingsLoader
import ImpUtils
import uuid
import sys
import shutil
import customresponders.uploadtracks.Utils as Utils


def ImportRefGenomeSummaryData(calculationObject, datasetId, folder):
    summaryids = []
    for dir in os.listdir(os.path.join(folder, 'summaryvalues')):
        if os.path.isdir(os.path.join(folder, 'summaryvalues', dir)):
            summaryids.append(dir)
    for summaryid in summaryids:
        calculationObject.SetInfo('Importing reference genome summary data '+summaryid)
        DQXUtils.CheckValidIdentifier(summaryid)
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
        print('SETTINGS: '+settings.ToJSON())
        print('Executing filter bank')
        ImpUtils.ExecuteFilterbankSummary(calculationObject, destFolder, summaryid, settings)
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
        ImpUtils.ExecuteSQL(datasetId, sql)



def ImportRefGenome(calculationObject, datasetId, folder):

    ImportRefGenomeSummaryData(calculationObject, datasetId, folder)

    settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'settings'))
    settings.DefineKnownTokens(['AnnotMaxViewportSize', 'RefSequenceSumm'])
    print('Settings: '+str(settings.Get()))
    ImpUtils.ImportGlobalSettings(calculationObject, datasetId, settings)

    # Import reference genome
    calculationObject.SetInfo('Converting reference genome')
    destfolder = config.BASEDIR + '/SummaryTracks/' + datasetId + '/Sequence'
    if not os.path.exists(destfolder):
        os.makedirs(destfolder)
    tempfastafile = destfolder + '/refsequence.fa'
    shutil.copyfile(os.path.join(folder, 'refsequence.fa'), tempfastafile)
    ImpUtils.RunConvertor(calculationObject, 'Fasta2FilterBankData', destfolder, ['refsequence.fa'])


    # Import chromosomes
    print('Loading chromosomes')
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
    tb.PrintRows(0, 99)
    sqlfile = ImpUtils.GetTempFileName()
    tb.SaveSQLDump(sqlfile, 'chromosomes')
    ImpUtils.ExecuteSQLScript(sqlfile, datasetId)
    os.remove(sqlfile)

    # Import annotation
    calculationObject.SetInfo('Converting annotation')
    tempgfffile = ImpUtils.GetTempFileName()
    temppath = os.path.dirname(tempgfffile)
    shutil.copyfile(os.path.join(folder, 'annotation.gff'), tempgfffile)
    ImpUtils.RunConvertor(calculationObject, 'ParseGFF', temppath, [os.path.basename(tempgfffile)])
    print('Importing annotation')
    ImpUtils.ExecuteSQLScript(os.path.join(temppath, 'annotation_dump.sql'), datasetId)
    os.remove(tempgfffile)
    os.remove(os.path.join(temppath, 'annotation.txt'))
    os.remove(os.path.join(temppath, 'annotation_dump.sql'))
    os.remove(os.path.join(temppath, 'annotation_create.sql'))
