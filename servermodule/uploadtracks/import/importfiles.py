import os
import DQXDbTools
import config
import customresponders.uploadtracks.VTTable as VTTable
import SettingsLoader
import ImportUtils
import uuid
import sys
import shutil
import customresponders.uploadtracks.Utils as Utils

import importworkspaces



def ImportGlobalSettings(datasetId, settings):
    for token in settings.GetTokenList():
        ImportUtils.ExecuteSQL(datasetId, 'INSERT INTO settings VALUES ("{0}", "{1}")'.format(token, settings[token]))


#path_DQXServer = '/Users/pvaut/Documents/SourceCode/DQXServer' #!!! todo: make this generic
path_DQXServer = '/home/pvaut/PycharmProjects/DQXServer' #!!! todo: make this generic

def RunConvertor(name, runpath, arguments):
    os.chdir(runpath)
    scriptPath = os.path.join(path_DQXServer, 'Convertors')
    cmd = config.pythoncommand + ' ' + scriptPath + '/' + name + '.py '+' '.join([str(a) for a in arguments])
    print('EXECUTING COMMAND '+cmd)
    os.system(cmd)

def ExecuteFilterbankSummary(destFolder, id, settings):
    RunConvertor('_CreateSimpleFilterBankData', destFolder,
                 [
                     id,
                     settings['MinVal'],
                     settings['MaxVal'],
                     settings['BlockSizeMin'],
                     2,
                     settings['BlockSizeMax']
                ]
    )


def ImportRefGenomeSummaryData(datasetId, folder):
    summaryids = []
    for dir in os.listdir(os.path.join(folder, 'summaryvalues')):
        if os.path.isdir(os.path.join(folder, 'summaryvalues', dir)):
            summaryids.append(dir)
    for summaryid in summaryids:
        print('### IMPORTING REF GENOME SUMMARY DATA '+summaryid)
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
        ExecuteFilterbankSummary(destFolder, summaryid, settings)
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
        ImportUtils.ExecuteSQL(datasetId, sql)



def ImportRefGenome(datasetId, folder):

    ImportRefGenomeSummaryData(datasetId, folder)

    settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'settings'))
    settings.DefineKnownTokens(['AnnotMaxViewportSize', 'RefSequenceSumm'])
    print('Settings: '+str(settings.Get()))
    ImportGlobalSettings(datasetId, settings)

    # Import reference genome
    print('Converting reference genome')
    destfolder = config.BASEDIR + '/SummaryTracks/' + datasetId + '/Sequence'
    if not os.path.exists(destfolder):
        os.makedirs(destfolder)
    tempfastafile = destfolder + '/refsequence.fa'
    shutil.copyfile(os.path.join(folder, 'refsequence.fa'), tempfastafile)
    RunConvertor('Fasta2FilterBankData', destfolder, ['refsequence.fa'])


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
    sqlfile = ImportUtils.GetTempFileName()
    tb.SaveSQLDump(sqlfile, 'chromosomes')
    ImportUtils.ExecuteSQLScript(sqlfile, datasetId)
    os.remove(sqlfile)

    # Import annotation
    print('Converting annotation')
    tempgfffile = ImportUtils.GetTempFileName()
    temppath = os.path.dirname(tempgfffile)
    shutil.copyfile(os.path.join(folder, 'annotation.gff'), tempgfffile)
    RunConvertor('ParseGFF', temppath, [os.path.basename(tempgfffile)])
    print('Importing annotation')
    ImportUtils.ExecuteSQLScript(os.path.join(temppath, 'annotation_dump.sql'), datasetId)
    os.remove(tempgfffile)
    os.remove(os.path.join(temppath, 'annotation.txt'))
    os.remove(os.path.join(temppath, 'annotation_dump.sql'))
    os.remove(os.path.join(temppath, 'annotation_create.sql'))





def ImportDataTable(datasetId, tableid, folder):
    print('==================================================================')
    print('IMPORTING DATATABLE {0} from {1}'.format(tableid, folder))
    print('==================================================================')

    tableSettings = SettingsLoader.SettingsLoader(os.path.join(os.path.join(folder, 'settings')))
    tableSettings.RequireTokens(['NameSingle', 'NamePlural', 'PrimKey', 'IsPositionOnGenome'])
    extraSettings = tableSettings.Clone()
    extraSettings.DropTokens(['NamePlural', 'NameSingle', 'PrimKey', 'IsPositionOnGenome'])

    # Add to tablecatalog
    sql = "INSERT INTO tablecatalog VALUES ('{0}', '{1}', '{2}', {3}, '{4}')".format(
        tableid,
        tableSettings['NamePlural'],
        tableSettings['PrimKey'],
        tableSettings['IsPositionOnGenome'],
        extraSettings.ToJSON()
    )
    ImportUtils.ExecuteSQL(datasetId, sql)

    # Load & create properties
    properties = []
    for fle in os.listdir(os.path.join(folder, 'properties')):
        if os.path.isfile(os.path.join(folder, 'properties', fle)):
            if fle.find('~') < 0:
                properties.append({'propid':fle})
    print('Properties: '+str(properties))

    for property in properties:
        propid = property['propid']
        settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'properties', propid))
        settings.DefineKnownTokens(['isCategorical', 'minval', 'maxval', 'decimDigits', 'showInBrowser', 'showInTable', 'categoryColors'])
        settings.ConvertToken_Boolean('isCategorical')
        settings.RequireTokens(['Name', 'DataType'])
        settings.AddTokenIfMissing('Order', 99999)
        property['DataType'] = settings['DataType']
        property['Order'] = settings['Order']
        extraSettings = settings.Clone()
        extraSettings.DropTokens(['Name', 'DataType', 'Order','SummaryValues'])
        sql = "INSERT INTO propertycatalog VALUES ('', 'fixed', '{0}', '{1}', '{2}', '{3}', {4}, '{5}')".format(
            settings['DataType'],
            propid,
            tableid,
            settings['Name'],
            settings['Order'],
            extraSettings.ToJSON()
        )
        ImportUtils.ExecuteSQL(datasetId, sql)
        property['settings'] = settings







    properties = sorted(properties, key=lambda k: k['Order'])
    propidList = []
    propDict = {}
    for property in properties:
        propDict[property['propid']] = property
        propidList.append(property['propid'])

    if tableSettings['IsPositionOnGenome']:
        if 'chrom' not in propDict:
            raise Exception('Genome-related datatable {0} is missing property "chrom"'.format(tableid))
        if 'pos' not in propDict:
            raise Exception('Genome-related datatable {0} is missing property "pos"'.format(tableid))

    # Load datatable
    print('Loading data table')
    tb = VTTable.VTTable()
    tb.allColumnsText = True
    try:
        tb.LoadFile(os.path.join(folder, 'data'))
    except Exception as e:
        raise Exception('Error while reading file: '+str(e))
    print('---- ORIG TABLE ----')
    tb.PrintRows(0, 9)

    for property in properties:
        if not tb.IsColumnPresent(property['propid']):
            raise Exception('Missing column "{0}" in datatable "{1}"'.format(property['propid'], tableid))

    if tableSettings['PrimKey'] not in propDict:
        raise Exception('Missing primary key property "{0}" in datatable "{1}"'.format(tableSettings['PrimKey'], tableid))

    for col in tb.GetColList():
        if col not in propDict:
            tb.DropCol(col)
    tb.ArrangeColumns(propidList)
    for property in properties:
        propid = property['propid']
        if property['DataType'] == 'Value':
            tb.ConvertColToValue(propid)
        if property['DataType'] == 'Boolean':
            tb.MapCol(propid, ImportUtils.convertToBooleanInt)
            tb.ConvertColToValue(propid)
    print('---- PROCESSED TABLE ----')
    tb.PrintRows(0, 9)

    createcmd = 'CREATE TABLE {0} ('.format(tableid)
    frst = True
    for property in properties:
        if not frst:
            createcmd += ', '
        propid = property['propid']
        colnr = tb.GetColNr(propid)
        datatypestr = ''
        if property['DataType'] == 'Text':
            maxlength = 1
            for rownr in tb.GetRowNrRange():
                maxlength = max(maxlength, len(tb.GetValue(rownr, colnr)))
            datatypestr = 'varchar({0})'.format(maxlength)
        if property['DataType'] == 'Value':
            datatypestr = 'float'
        if property['DataType'] == 'Boolean':
            datatypestr = 'int'
        createcmd += propid + ' ' + datatypestr
        frst = False
    createcmd += ')'

    print('Creating datatable')
    scr = ImportUtils.SQLScript()
    scr.AddCommand('drop table if exists {0}'.format(tableid))
    scr.AddCommand(createcmd)
    scr.AddCommand('create unique index {0}_{1} ON {0}({1})'.format(tableid, tableSettings['PrimKey']))
    if tableSettings['IsPositionOnGenome']:
        scr.AddCommand('create index {0}_chrompos ON {0}(chrom,pos)'.format(tableid))
    scr.Execute(datasetId)

    print('Loading datatable values')
    sqlfile = ImportUtils.GetTempFileName()
    tb.SaveSQLDump(sqlfile, tableid)
    ImportUtils.ExecuteSQLScript(sqlfile, datasetId)
    os.remove(sqlfile)



    print('Creating summary values')
    for property in properties:
        propid = property['propid']
        settings = property['settings']
        if settings.HasToken('SummaryValues'):
            summSettings = settings.GetSubSettings('SummaryValues')
            if settings.HasToken('minval'):
                summSettings.AddTokenIfMissing('MinVal', settings['minval'])
            summSettings.AddTokenIfMissing('MaxVal', settings['maxval'])
            summSettings.RequireTokens(['BlockSizeMax'])
            summSettings.AddTokenIfMissing('MinVal', 0)
            summSettings.AddTokenIfMissing('BlockSizeMin', 1)
            summSettings.DefineKnownTokens(['channelColor'])
            print('Executing filter bank')
            destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', datasetId, propid)
            if not os.path.exists(destFolder):
                os.makedirs(destFolder)
            dataFileName = os.path.join(destFolder, propid)
            fp = open(dataFileName, 'w')
            colnr_chrom = tb.GetColNr('chrom')
            colnr_pos = tb.GetColNr('pos')
            colnr_val = tb.GetColNr(propid)
            for rownr in tb.GetRowNrRange():
                fp.write("{0}\t{1}\t{2}\n".format(
                    tb.GetValue(rownr, colnr_chrom),
                    int(tb.GetValue(rownr, colnr_pos)),
                    tb.GetValue(rownr, colnr_val)
                ))
            fp.close()
            ExecuteFilterbankSummary(destFolder, propid, summSettings)
            extraSummSettings = summSettings.Clone()
            extraSummSettings.DropTokens(['MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax'])
            sql = "INSERT INTO summaryvalues VALUES ('', 'fixed', '{0}', '{1}', '{2}', {3}, '{4}', {5}, {6}, {7})".format(
                propid,
                tableid,
                settings['Name'],
                -1,
                extraSummSettings.ToJSON(),
                summSettings['MinVal'],
                summSettings['MaxVal'],
                summSettings['BlockSizeMin']
            )
            ImportUtils.ExecuteSQL(datasetId, sql)






def ImportDataSet(baseFolder, datasetId):
    print('==================================================================')
    print('IMPORTING DATASET {0}'.format(datasetId))
    print('==================================================================')
    datasetFolder = os.path.join(baseFolder, datasetId)
    indexDb = 'datasetindex'

    globalSettings = SettingsLoader.SettingsLoader(os.path.join(datasetFolder, 'settings'))
    globalSettings.RequireTokens(['Name'])
    print('Global settings: '+str(globalSettings.Get()))


    # Dropping existing database
    print('Dropping database')
    ImportUtils.ExecuteSQL(indexDb, 'DELETE FROM datasetindex WHERE id="{0}"'.format(datasetId))
    try:
        ImportUtils.ExecuteSQL(indexDb, 'DROP DATABASE IF EXISTS {0}'.format(datasetId))
    except:
        pass
    ImportUtils.ExecuteSQL(indexDb, 'CREATE DATABASE {0}'.format(datasetId))


    # Creating new database
    print('Creating new database')
    with open('createdataset.sql', 'r') as content_file:
        sqlCreateCommands = content_file.read()
    ImportUtils.ExecuteSQL(datasetId, sqlCreateCommands)

    # Global settings
    print('Defining global settings')
    ImportGlobalSettings(datasetId, globalSettings)


    datatables = []
    for dir in os.listdir(os.path.join(datasetFolder,'datatables')):
        if os.path.isdir(os.path.join(datasetFolder, 'datatables', dir)):
            datatables.append(dir)
    print('Data tables: '+str(datatables))
    for datatable in datatables:
        ImportDataTable(datasetId, datatable, os.path.join(datasetFolder, 'datatables', datatable))


    ImportRefGenome(datasetId, os.path.join(datasetFolder, 'refgenome'))

    importworkspaces.ImportWorkspaces(datasetFolder, datasetId)

    # Finalise: register dataset
    print('Registering data set')
    ImportUtils.ExecuteSQL(indexDb, 'INSERT INTO datasetindex VALUES ("{0}", "{1}")'.format(datasetId, globalSettings['Name']))



def ImportFileSet(baseFolder):
    datasets = []
    for dir in os.listdir(baseFolder):
        if os.path.isdir(os.path.join(baseFolder, dir)):
            datasets.append(dir)
    for dataset in datasets:
        ImportDataSet(baseFolder, dataset)






ImportFileSet(config.SOURCEDATADIR + '/datasets')