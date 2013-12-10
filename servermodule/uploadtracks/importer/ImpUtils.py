import os
import config
import uuid
import DQXDbTools
import DQXUtils

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


def ExecuteSQLScript(calculationObject, filename, databaseName, outputfilename=None):
    calculationObject.LogSQLCommand(databaseName+':SQL file')
    if not os.path.exists(filename):
        raise Exception('Unable to find SQL file '+filename)
    cmd = config.mysqlcommand + " -u {0} -p{1} {2} --column-names=FALSE < {3}".format(config.DBUSER, config.DBPASS, databaseName, filename)
    if outputfilename is not None:
        cmd += ' > ' + outputfilename
    os.system(cmd)

class SQLScript:
    def __init__(self, calculationObject):
        self.commands = []
        self.calculationObject = calculationObject

    def AddCommand(self, cmd):
        self.commands.append(cmd)

    def Execute(self, databaseName, outputfilename=None):
        filename = GetTempFileName()
        fp = open(filename, 'w')
        for cmd in self.commands:
            fp.write(cmd+';\n')
        fp.close()
        ExecuteSQLScript(self.calculationObject, filename, databaseName, outputfilename)
        os.remove(filename)




def ExecuteSQL(calculationObject, database, command):
    calculationObject.LogSQLCommand(database+';'+command)
    db = DQXDbTools.OpenDatabase(database)
    db.autocommit(True)
    cur = db.cursor()
    cur.execute(command)
    cur.close()
    db.close()

def RunConvertor(calculationObject, name, runpath, arguments):
    path_DQXServer = DQXUtils.GetDQXServerPath()
    scriptFile = os.path.join(path_DQXServer, 'Convertors', name + '.py')
    calculationObject.RunPythonScript(scriptFile, runpath, arguments)


def ExecuteFilterbankSummary(calculationObject, destFolder, id, settings):
    RunConvertor(calculationObject, '_CreateSimpleFilterBankData', destFolder,
                 [
                     id,
                     settings['MinVal'],
                     settings['MaxVal'],
                     settings['BlockSizeMin'],
                     2,
                     settings['BlockSizeMax']
                ]
    )

def ImportGlobalSettings(calculationObject, datasetId, settings):
    for token in settings.GetTokenList():
        ExecuteSQL(calculationObject, datasetId, 'INSERT INTO settings VALUES ("{0}", "{1}")'.format(token, settings[token]))


def ExtractColumns(calculationObject, sourceFileName, destFileName, colList, writeHeader):
    calculationObject.Log('Extracting columns {0} from {1} to {2}'.format(','.join(colList), sourceFileName, destFileName))
    with open(sourceFileName, 'r') as sourceFile:
        with open(destFileName, 'w') as destFile:
            if writeHeader:
                destFile.write('\t'.join(colList) + '\n')
            header = sourceFile.readline().rstrip('\r\n').split('\t')
            calculationObject.Log('Original header: {0}'.format(','.join(header)))
            colindices = []
            for col in colList:
                try:
                     colindices.append(header.index(col))
                except ValueError:
                    raise Exception('Unable to find column {0} in file {1}'.format(col, sourceFileName))
            for line in sourceFile:
                line = line.rstrip('\r\n')
                if len(line) > 0:
                    columns = line.split('\t')
                    destFile.write('\t'.join([columns[colindex] for colindex in colindices]) + '\n')


def CreateSummaryValues(calculationObject, summSettings, datasetId, tableid, sourceid, workspaceid, propid, name, dataFileName, importSettings):
    summSettings.RequireTokens(['BlockSizeMax'])
    summSettings.AddTokenIfMissing('MinVal', 0)
    summSettings.AddTokenIfMissing('BlockSizeMin', 1)
    summSettings.DefineKnownTokens(['channelColor'])
    destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', datasetId, propid)
    if not os.path.exists(destFolder):
        os.makedirs(destFolder)
    # dataFileName = sourceFileName
    # dataFileName = os.path.join(destFolder, propid)
    # ExtractColumns(calculationObject, sourceFileName, dataFileName, ['chrom', 'pos', propid], False)
    if not importSettings['ConfigOnly']:
        calculationObject.Log('Executing filter bank')
        ExecuteFilterbankSummary(calculationObject, destFolder, propid, summSettings)
    extraSummSettings = summSettings.Clone()
    extraSummSettings.DropTokens(['MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax'])
    sql = "DELETE FROM summaryvalues WHERE (propid='{0}') and (tableid='{1}') and (source='{2}') and (workspaceid='{3}')".format(propid, tableid, sourceid, workspaceid)
    ExecuteSQL(calculationObject, datasetId, sql)
    sql = "INSERT INTO summaryvalues VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', {5}, '{6}', {7}, {8}, {9})".format(
        workspaceid,
        sourceid,
        propid,
        tableid,
        name,
        -1,
        extraSummSettings.ToJSON(),
        summSettings['MinVal'],
        summSettings['MaxVal'],
        summSettings['BlockSizeMin']
    )
    ExecuteSQL(calculationObject, datasetId, sql)
