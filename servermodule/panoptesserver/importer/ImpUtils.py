# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import numpy
import re
import config
import uuid
import DQXDbTools
import DQXUtils
import errno
import SettingsLoader
from DQXTableUtils import VTTable
import customresponders.panoptesserver.Utils as Utils
import simplejson

def convertToBooleanInt(vl):
    if vl is None:
        return None
    if (vl.lower() == 'true') or (vl.lower() == 'yes') or (vl.lower() == 'y') or (vl == '1') or (vl == '1.0'):
        return 1
    if (vl.lower() == 'false') or (vl.lower() == 'no') or (vl.lower() == 'n') or (vl == '0') or (vl == '0.0'):
        return 0
    return None

def IsValueDataTypeIdenfifier(datatypeIdentifier):
    return (datatypeIdentifier == 'Value') or \
           (datatypeIdentifier == 'GeoLongitude') or\
           (datatypeIdentifier == 'GeoLattitude') or\
           (datatypeIdentifier == 'LowPrecisionValue') or\
           (datatypeIdentifier == 'HighPrecisionValue') or\
           (datatypeIdentifier == 'Date')

def IsDateDataTypeIdenfifier(datatypeIdentifier):
    return (datatypeIdentifier == 'Date')


def GetSQLDataType(datatypeIdentifier):
    datatypestr = 'varchar(50)'
    if IsValueDataTypeIdenfifier(datatypeIdentifier):
        datatypestr = 'double'
    if (datatypeIdentifier == 'LowPrecisionValue'):
        datatypestr = 'float'
    if datatypeIdentifier == 'Boolean':
        datatypestr = 'int'
    return datatypestr

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
        cmd = config.mysqlcommand
        customlogin = False
        cmdArguments = {}
        try:
            if len(config.DBUSER) > 0:
                cmd += " -u {username}"
                cmdArguments['username'] = config.DBUSER
                try:
                    if len(config.DBPASS) > 0:
                        cmd += " -p'{password}'"
                        cmdArguments['password'] = config.DBPASS
                except:
                    pass
                customlogin = True
        except:
            pass
        cmd +=" {database} --column-names=FALSE < {filename}".format(database=databaseName, filename=filename)
        if outputfilename is not None:
            cmd += ' > ' + outputfilename
        if calculationObject.logfilename is not None:
            cmd += ' 2>> ' + calculationObject.logfilename
        calculationObject.Log('COMMAND:' + cmd)
        if customlogin:
            cmd = cmd.format(**cmdArguments)
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
    db = DQXDbTools.OpenDatabase(calculationObject.credentialInfo, database)
    db.autocommit(True)
    cur = db.cursor()
    cur.execute(command)
    cur.close()
    db.close()

def ExecuteSQLQuery(calculationObject, database, query):
    calculationObject.LogSQLCommand(database+';'+query)
    db = DQXDbTools.OpenDatabase(calculationObject.credentialInfo, database)
    cur = db.cursor()
    cur.execute(query)
    result = cur.fetchall()
    cur.close()
    db.close()
    return result

def ExecuteSQLGenerator(calculationObject, database, commands):
    db = DQXDbTools.OpenDatabase(calculationObject.credentialInfo, database)
    db.autocommit(True)
    cur = db.cursor()
    for i, command in enumerate(commands):
        if i < 5:
            calculationObject.LogSQLCommand(database+';'+command.func_closure[-1].cell_contents)
        if i == 5:
            calculationObject.LogSQLCommand(database+'; Commands truncated...')
        command(cur)
    cur.close()
    db.close()


def RunConvertor(calculationObject, name, runpath, arguments):
    path_DQXServer = DQXUtils.GetDQXServerPath()
    scriptFile = os.path.join(path_DQXServer, 'Convertors', name + '.py')
    calculationObject.RunPythonScript(scriptFile, runpath, arguments)


def ExecuteFilterbankSummary_Value(calculationObject, destFolder, id, settings):
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

def ExecuteFilterbankSummary_Categorical(calculationObject, destFolder, id, settings):
    RunConvertor(calculationObject, '_CreateMultiCategoryDensityFilterBankData', destFolder,
                 [
                     id,
                     settings['BlockSizeMin'],
                     2,
                     settings['BlockSizeMax'],
                     ';'.join(settings['Categories'])
                ]
    )

def ImportGlobalSettings(calculationObject, datasetId, settings):
    calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, 'settings'))
    for token in settings.GetTokenList():
        st =settings[token]
        if (type(st) is list) or (type(st) is dict):
            st = simplejson.dumps(st)
        ExecuteSQL(calculationObject, datasetId, "INSERT INTO settings VALUES ('{0}', '{1}')".format(
            token,
            st
            ))


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
                DQXUtils.CheckValidColumnIdentifier(propid)
                settings.AddDict(propSource)

    if (impSettings.HasToken('AutoScanProperties')) and (impSettings['AutoScanProperties']):
        calculationObject.Log('Auto determining columns')
        tb = VTTable.VTTable()
        tb.allColumnsText = True
        try:
            tb.LoadFile(datafile, 9999)
        except Exception as e:
            raise Exception('Error while reading data file: '+str(e))
        for propid in tb.GetColList():
            propidcorr = propid.replace(' ', '_')
            if propidcorr != propid:
                tb.RenameCol(propid, propidcorr)
            try:
                DQXUtils.CheckValidColumnIdentifier(propidcorr)
            except Exception as e:
                raise Exception('Invalid data table column header:\n '+str(e))

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

                DQXUtils.CheckValidColumnIdentifier(propid)
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
        settings.AddTokenIfMissing('Search', 'None')
        settings.DefineKnownTokens(['isCategorical', 'minval', 'maxval', 'decimDigits', 'showInBrowser', 'showInTable', 'categoryColors', 'channelName', 'channelColor', 'connectLines', 'SummaryValues'])
        settings.RequireTokens(['DataType'])
        settings.ConvertToken_Boolean('isCategorical')
        if settings.HasToken('isCategorical') and settings['isCategorical']:
            settings.SetToken('Index', True) # Categorical data types are always indexed
        if settings.HasToken('Relation'):
            settings.SetToken('Index', True) # Relation child properties are always indexed
        if settings['Search'] not in ['None', 'StartPattern', 'Pattern', 'Match']:
            raise Exception('Property "Search" token should be None,StartPattern,Pattern,Match')
        if settings['Search'] in ['StartPattern', 'Pattern', 'Match']:
            settings.SetToken('Index', True) # Use index to speed up search
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
    for property in properties:
        DQXUtils.CheckValidColumnIdentifier(property['propid'])
    return properties


def ExtractColumns(calculationObject, sourceFileName, destFileName, colList, writeHeader, importSettings):
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
    calculationObject.Log('Extracting columns {0} from {1} to {2}'.format(','.join(colList), sourceFileName, destFileName))
    lineNr = 0
    with open(sourceFileName, 'r') as sourceFile:
        with open(destFileName, 'w') as destFile:
            if writeHeader:
                destFile.write('\t'.join(colList) + '\n')
            header = [colname.replace(' ', '_') for colname in sourceFile.readline().rstrip('\r\n').split('\t')]
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
                lineNr += 1
                if (maxLineCount > 0) and (lineNr >= maxLineCount):
                    calculationObject.Log('WARNING: limiting at line ' + str(lineNr))
                    break


def CreateSummaryValues_Value(calculationObject, summSettings, datasetId, tableid, sourceid, workspaceid, propid, name, dataFileName, importSettings):
    calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, 'summaryvalues'))
    summSettings.RequireTokens(['BlockSizeMax'])
    summSettings.AddTokenIfMissing('MinVal', 0)
    summSettings.AddTokenIfMissing('BlockSizeMin', 1)
    summSettings.DefineKnownTokens(['channelColor'])
    destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', datasetId, propid)
    if not os.path.exists(destFolder):
        os.makedirs(destFolder)
    if not importSettings['ConfigOnly']:
        calculationObject.Log('Executing filter bank')
        ExecuteFilterbankSummary_Value(calculationObject, destFolder, propid, summSettings)
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



def CreateSummaryValues_Categorical(calculationObject, summSettings, datasetId, tableid, sourceid, workspaceid, propid, name, dataFileName, importSettings):
    calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, 'summaryvalues'))
    summSettings.RequireTokens(['BlockSizeMin', 'BlockSizeMax'])
    summSettings.AddTokenIfMissing('MaxVal', 1.0)
    destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', datasetId, propid)
    if not os.path.exists(destFolder):
        os.makedirs(destFolder)
    if not importSettings['ConfigOnly']:
        calculationObject.Log('Executing filter bank')
        ExecuteFilterbankSummary_Categorical(calculationObject, destFolder, propid, summSettings)
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
        0,
        summSettings['MaxVal'],
        summSettings['BlockSizeMin']
    )
    ExecuteSQL(calculationObject, datasetId, sql)


class Numpy_to_SQL(object):
    def sanitise_row(self, row):
        return tuple(int(b) if type(b) == numpy.bool_ else b for b in row)

    def dtype_to_column_type(self, dtype):
        dtype = dtype.replace('<', '').replace('>', '').replace('|', '')
        simple_conversion = {
            '?': 'BOOL',
            'b1': 'BOOL',
            'i1': 'TINYINT',
            'i2': 'SMALLINT',
            'i4': 'INT',
            'i8': 'BIGINT',
            'u1': 'TINYINT UNSIGNED',
            'u2': 'SMALLINT  UNSIGNED',
            'u4': 'INT UNSIGNED',
            'u8': 'BIGINT UNSIGNED',
            'f2': 'FLOAT',
            'f4': 'FLOAT',
            'f8': 'DOUBLE',
        }
        func_convert = {
            'S\d+': lambda d: 'VARCHAR(' + d.replace('S', '') + ')',
            'U\d+': lambda d: 'VARCHAR(' + d.replace('S', '') + ') UNICODE'
        }
        for key, func in func_convert.items():
            if re.search('^' + key + '$', dtype) is not None:
                return func(dtype)
        for i, o in simple_conversion.items():
            if dtype == i:
                return o
        raise ValueError('Unknown dtype:' + dtype)

    #Currently assumes simple 1D
    def create_table(self, table_name, column_name, array):
        sql = "DROP TABLE IF EXISTS `{0}`".format(table_name, )
        yield lambda cur: cur.execute(sql)
        column_type = self.dtype_to_column_type(str(array.dtype))
        sql = "CREATE TABLE `{0}` (`{1}` {2})".format(table_name, column_name, column_type)
        yield lambda cur: cur.execute(sql)
        for start in range(0, len(array), 500):
            end = min(start + 500, len(array))
            sql = "INSERT INTO `{0}` (`{1}`) VALUES (%s)".format(table_name, column_name)
            data = [(ele,) for ele in array[start: end]]
            yield lambda cur: cur.executemany(sql,
                                              data)

def mkdir(name):
    try:
        os.makedirs(name)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise


def IsDatasetPresentInServer(credInfo, datasetId):
    db = DQXDbTools.OpenDatabase(credInfo)
    cur = db.cursor()
    cur.execute('SELECT count(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = "{0}"'.format(datasetId))
    return cur.fetchone()[0] > 0

