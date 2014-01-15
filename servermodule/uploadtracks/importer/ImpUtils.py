import os
import config
import uuid
import DQXDbTools
import DQXUtils
import errno
import SettingsLoader
import customresponders.uploadtracks.VTTable as VTTable

def convertToBooleanInt(vl):
    if vl is None:
        return None
    if (vl.lower() == 'true') or (vl.lower() == 'yes') or (vl.lower() == 'y') or (vl == '1') or (vl == '1.0'):
        return 1
    if (vl.lower() == 'false') or (vl.lower() == 'no') or (vl.lower() == 'n') or (vl == '0') or (vl == '0.0'):
        return 0
    return None

def IsValueDataTypeIdenfifier(datatypeIdentifier):
    return (datatypeIdentifier == 'Value') or (datatypeIdentifier == 'GeoLongitude') or (datatypeIdentifier == 'GeoLattitude')


def GetTempFileName():
    #Check the temp dir exists and then return a new file name in it
    temp_dir = os.path.join(config.BASEDIR,'temp')
    try:
        os.makedirs(temp_dir)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise
    return os.path.join(temp_dir, 'TMP'+str(uuid.uuid1()).replace('-', '_'))


def ExecuteSQLScript(calculationObject, filename, databaseName, outputfilename=None):
    with calculationObject.LogSubHeader('SQL file on '+databaseName):
        if not os.path.exists(filename):
            raise Exception('Unable to find SQL file '+filename)
        #Log (start of) script
        with open(filename) as fp:
            linect = 0
            for line in fp:
                if len(line)>200:
                    line = line[:200] + '...'
                calculationObject.LogSQLCommand(line)
                linect += 1
                if linect > 15:
                    calculationObject.LogSQLCommand('...')
                    break
        cmd = config.mysqlcommand + " -u {0} -p{1} {2} --column-names=FALSE < {3}".format(config.DBUSER, config.DBPASS, databaseName, filename)
        if outputfilename is not None:
            cmd += ' > ' + outputfilename
        if calculationObject.logfilename is not None:
            cmd += ' 2>> ' + calculationObject.logfilename
        calculationObject.Log('COMMAND:' + cmd)
        rt = os.system(cmd)
        if (rt != 0) and (rt != 1):
            raise Exception('SQL script error; return code '+str(rt))

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


def LoadPropertyInfo(calculationObject, impSettings, datafile):
    calculationObject.Log('Determining properties')
    properties = []
    propidMap = {}

    autoPrimKey = (impSettings.HasToken('PrimKey') and (impSettings['PrimKey'] == 'AutoKey'))

    if autoPrimKey:
        propid = impSettings['PrimKey']
        property = {'propid': propid}
        propidMap[propid] = property
        properties.append(property)
        settings = SettingsLoader.SettingsLoader()
        settings.LoadDict({
            'Name': impSettings['PrimKey'],
            'ShowInTable': True,
            'DataType': 'Value',
            'DecimDigits': 0
        })
        property['Settings'] = settings

    if impSettings.HasToken('Properties'):
        if not type(impSettings['Properties']) is list:
            raise Exception('Properties token should be a list')
        for propSource in impSettings['Properties']:
            if 'Id' not in propSource:
                raise Exception('Property is missing Id field')
            propids = propSource['Id']
            for propid in propids.split(','):
                propid = propid.strip()
                if propid in propidMap:
                    property = propidMap[propid]
                    settings = property['Settings']
                else:
                    property = {'propid': propid}
                    settings = SettingsLoader.SettingsLoader()
                    settings.LoadDict({})
                    property['Settings'] = settings
                    propidMap[propid] = property
                    properties.append(property)
                DQXUtils.CheckValidIdentifier(propid)
                settings.AddDict(propSource)

    if (impSettings.HasToken('AutoScanProperties')) and (impSettings['AutoScanProperties']):
        calculationObject.Log('Auto determining columns')
        tb = VTTable.VTTable()
        tb.allColumnsText = True
        try:
            tb.LoadFile(datafile, 9999)
        except Exception as e:
            raise Exception('Error while reading data file: '+str(e))
        with calculationObject.LogDataDump():
            tb.PrintRows(0, 9)
        for propid in tb.GetColList():
            if propid not in propidMap:
                property = { 'propid': propid }
                colnr = tb.GetColNr(propid)
                cnt_tot = 0
                cnt_isnumber = 0
                cnt_isbool = 0
                for rownr in tb.GetRowNrRange():
                    val = tb.GetValue(rownr, colnr)
                    if val is not None:
                        cnt_tot += 1
                        try:
                            float(val)
                            cnt_isnumber += 1
                        except ValueError:
                            pass
                        if val in ['True', 'true', 'TRUE', 'False', 'false', 'FALSE', '1', '0']:
                            cnt_isbool += 1

                property['DataType'] = 'Text'
                if (cnt_isnumber > 0.75*cnt_tot) and (cnt_isnumber > cnt_isbool):
                    property['DataType'] = 'Value'
                if (cnt_isbool == cnt_tot) and (cnt_isbool >= cnt_isnumber):
                    property['DataType'] = 'Boolean'

                DQXUtils.CheckValidIdentifier(propid)
                settings = SettingsLoader.SettingsLoader()
                settings.LoadDict({})
                settings.AddTokenIfMissing('Name', propid)
                settings.AddTokenIfMissing('DataType', property['DataType'])
                property['Settings'] = settings
                properties.append(property)
                propidMap[propid] = property

    for property in properties:
        settings = property['Settings']
        settings.AddTokenIfMissing('Index', False)
        settings.DefineKnownTokens(['isCategorical', 'minval', 'maxval', 'decimDigits', 'showInBrowser', 'showInTable', 'categoryColors'])
        settings.RequireTokens(['DataType'])
        settings.ConvertToken_Boolean('isCategorical')
        if settings.HasToken('isCategorical') and settings['isCategorical']:
            settings.SetToken('Index', True) # Categorical data types are always indexed
        if settings.HasToken('Relation'):
            settings.SetToken('Index', True) # Relation child properties are always indexed
        settings.AddTokenIfMissing('Name', property['propid'])
        settings.AddTokenIfMissing('ReadData', True)
        settings.ConvertToken_Boolean('ReadData')
        settings.AddTokenIfMissing('CanUpdate', False)
        settings.ConvertToken_Boolean('CanUpdate')
        settings.ConvertStringsToSafeSQL()
        property['DataType'] = settings['DataType']

    if len(properties) == 0:
        raise Exception('No properties defined. Use "AutoScanProperties: true" or "Properties" list to define')

    calculationObject.Log('Properties found:')
    with calculationObject.LogDataDump():
        for property in properties:
            calculationObject.Log(str(property)+' | '+property['Settings'].ToJSON())
    return properties


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
