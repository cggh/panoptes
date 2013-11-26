import os
import DQXDbTools
import config
#import simplejson
#import copy
import VTTable
import SettingsLoader
import uuid
import sys
import shutil


def convertToBooleanInt(vl):
    if vl is None:
        return None
    if (vl.lower() == 'true') or (vl.lower() == 'yes') or (vl.lower() == 'y') or (vl == '1') or (vl == '1.0'):
        return 1
    if (vl.lower() == 'false') or (vl.lower() == 'no') or (vl.lower() == 'n') or (vl == '0') or (vl == '0.0'):
        return 0
    return None


def GetTempFileName():
    return os.path.join(config.BASEDIR,'temp','TMP'+str(uuid.uuid1()).replace('-', '_'))


def ExecuteSQLScript(filename, databaseName):
    cmd = config.mysqlcommand + " -u {0} -p{1} {2} < {3}".format(config.DBUSER, config.DBPASS, databaseName, filename)
    os.system(cmd)

class SQLScript:
    def __init__(self):
        self.commands = []

    def AddCommand(self, cmd):
        self.commands.append(cmd)

    def Execute(self, databaseName):
        filename = GetTempFileName()
        fp = open(filename, 'w')
        for cmd in self.commands:
            fp.write(cmd+';\n')
        fp.close()
        ExecuteSQLScript(filename, databaseName)
        os.remove(filename)




def ExecuteSQL(database, command):
    db = DQXDbTools.OpenDatabase(database)
    db.autocommit(True)
    cur = db.cursor()
    cur.execute(command)
    cur.close()
    db.close()

path_DQXServer = '/Users/pvaut/Documents/SourceCode/DQXServer' #!!! todo: make this generic

def RunConvertor(name, runpath, arguments):
    os.chdir(runpath)
    scriptPath = os.path.join(path_DQXServer, 'Convertors')
    cmd = config.pythoncommand + ' ' + scriptPath + '/' + name + '.py '+' '.join(arguments)
    print('EXECUTING COMMAND '+cmd)
    os.system(cmd)



def ImportRefGenome(datasetId, folder):

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
    sqlfile = GetTempFileName()
    tb.SaveSQLDump(sqlfile, 'chromosomes')
    ExecuteSQLScript(sqlfile, datasetId)
    os.remove(sqlfile)

    # Import annotation
    print('Converting annotation')
    tempgfffile = GetTempFileName()
    temppath = os.path.dirname(tempgfffile)
    shutil.copyfile(os.path.join(folder, 'annotation.gff'), tempgfffile)
    RunConvertor('ParseGFF', temppath, [os.path.basename(tempgfffile)])
    print('Importing annotation')
    ExecuteSQLScript(os.path.join(temppath, 'annotation_dump.sql'), datasetId)
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
    ExecuteSQL(datasetId, sql)

    # Load & create properties
    properties = []
    for fle in os.listdir(os.path.join(folder, 'properties')):
        if os.path.isfile(os.path.join(folder, 'properties', fle)):
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
        extraSettings.DropTokens(['Name', 'DataType', 'Order'])
        sql = "INSERT INTO propertycatalog VALUES ('', 'fixed', '{0}', '{1}', '{2}', '{3}', {4}, '{5}')".format(
            settings['DataType'],
            propid,
            tableid,
            settings['Name'],
            settings['Order'],
            extraSettings.ToJSON()
        )
        ExecuteSQL(datasetId, sql)

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
            tb.MapCol(propid, convertToBooleanInt)
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
    scr = SQLScript()
    scr.AddCommand('drop table if exists {0}'.format(tableid))
    scr.AddCommand(createcmd)
    scr.AddCommand('create unique index {0}_{1} ON {0}({1})'.format(tableid, tableSettings['PrimKey']))
    if tableSettings['IsPositionOnGenome']:
        scr.AddCommand('create index {0}_chrompos ON {0}(chrom,pos)'.format(tableid))
    scr.Execute(datasetId)

    print('Loading datatable values')
    sqlfile = GetTempFileName()
    tb.SaveSQLDump(sqlfile, tableid)
    ExecuteSQLScript(sqlfile, datasetId)
    os.remove(sqlfile)











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
    ExecuteSQL(indexDb, 'DELETE FROM datasetindex WHERE id="{0}"'.format(datasetId))
    try:
        ExecuteSQL(indexDb, 'DROP DATABASE IF EXISTS {0}'.format(datasetId))
    except:
        pass
    ExecuteSQL(indexDb, 'CREATE DATABASE {0}'.format(datasetId))


    # Creating new database
    print('Creating new database')
    with open('createdataset.sql', 'r') as content_file:
        sqlCreateCommands = content_file.read()
    ExecuteSQL(datasetId, sqlCreateCommands)

    # Global settings
    print('Defining global settings')
    for token in globalSettings.GetTokenList():
        ExecuteSQL(datasetId, 'INSERT INTO settings VALUES ("{0}", "{1}")'.format(token, globalSettings[token]))

    ImportRefGenome(datasetId, os.path.join(datasetFolder, 'refgenome'))


    datatables = []
    for dir in os.listdir(os.path.join(datasetFolder,'datatables')):
        if os.path.isdir(os.path.join(datasetFolder, 'datatables', dir)):
            datatables.append(dir)
    print('Data tables: '+str(datatables))
    for datatable in datatables:
        ImportDataTable(datasetId, datatable, os.path.join(datasetFolder, 'datatables', datatable))


    # Finalise: register dataset
    print('Registering data set')
    ExecuteSQL(indexDb, 'INSERT INTO datasetindex VALUES ("{0}", "{1}")'.format(datasetId, globalSettings['Name']))



def ImportFileSet(baseFolder):
    datasets = []
    for dir in os.listdir(baseFolder):
        if os.path.isdir(os.path.join(baseFolder, dir)):
            datasets.append(dir)
    for dataset in datasets:
        ImportDataSet(baseFolder, dataset)






ImportFileSet(config.SOURCEDATADIR + '/datasets')