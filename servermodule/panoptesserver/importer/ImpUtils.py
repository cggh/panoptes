# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
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

def IsValidDataTypeIdenfifier(datatypeIdentifier):
    return datatypeIdentifier in ['Text', 'Value', 'LowPrecisionValue', 'HighPrecisionValue', 'Boolean', 'GeoLongitude', 'GeoLattitude', 'Date']

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
                if len(line)>100:
                    line = line[:100] + '...'
                calculationObject.LogSQLCommand(line)
                linect += 1
                if linect > 10:
                    calculationObject.LogSQLCommand('...')
                    break
        cmd = config.mysqlcommand
        customlogin = False
        cmdArguments = {}
        try:
            if len(config.DBUSER) > 0:
                cmd += " -h {host} -u {username}"
                cmdArguments['username'] = config.DBUSER
                cmdArguments['host'] = config.DBSRV
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




def ExecuteSQL(calculationObject, database, command, ):
    calculationObject.LogSQLCommand(database+';'+command)
    with DQXDbTools.DBCursor(calculationObject.credentialInfo, database, local_infile = 1) as cur:
        cur.db.autocommit(True)
        cur.execute(command)

def ExecuteSQLQuery(calculationObject, database, query):
    calculationObject.LogSQLCommand(database+';'+query)
    with DQXDbTools.DBCursor(calculationObject.credentialInfo, database) as cur:
        cur.execute(query)
        return cur.fetchall()

def ExecuteSQLGenerator(calculationObject, database, commands):
    with DQXDbTools.DBCursor(calculationObject.credentialInfo, database) as cur:
        for i, command in enumerate(commands):
            if i < 5:
                calculationObject.LogSQLCommand(database+';'+command.func_closure[-1].cell_contents)
            if i == 5:
                calculationObject.LogSQLCommand(database+'; Commands truncated...')
            command(cur)
            cur.commit()


def RunConvertor(calculationObject, name, runpath, arguments):
    path_DQXServer = DQXUtils.GetDQXServerPath()
    scriptFile = os.path.join(path_DQXServer, 'Convertors', name + '.py')
    calculationObject.RunPythonScript(scriptFile, runpath, arguments)


def ExecuteFilterbankSummary_Value(calculationObject, destFolder, id, settings, maxcount=-1):
    RunConvertor(calculationObject, '_CreateSimpleFilterBankData', destFolder,
                 [
                     id,
                     settings['MinVal'],
                     settings['MaxVal'],
                     settings['BlockSizeMin'],
                     2,
                     settings['BlockSizeMax'],
                     maxcount
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

        if token == 'IntroSections':
            if not(type(st) is list):
                raise Exception('IntroSections token should be a list')
            for sect in st:
                if not(type(sect) is dict):
                    raise Exception('IntroSections token should be a list of maps')
                if 'Content' in sect:
                    sect['Content'] = sect['Content'].replace('\r', '\\r').replace('\n', '\\n').replace('"', '\\"')

        if (type(st) is list) or (type(st) is dict):
            st = simplejson.dumps(st)
        ExecuteSQL(calculationObject, datasetId, "INSERT INTO settings VALUES ('{0}', '{1}')".format(
            token,
            st
            ))


def LoadPropertyInfo(calculationObject, impSettings, datafile, log = False):
    
    if log:
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
            if not(isinstance(propids, basestring)):
                raise Exception('Property has invalid Id field: '+str(propids))
            for propid in propids.split(','):
                propid = propid.strip()
                try:
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
                except Exception as e:
                    raise Exception('Invalid property "{0}": {1}'.format(propid, str(e)))

    if (impSettings.HasToken('AutoScanProperties')) and (impSettings['AutoScanProperties']):
        try:
            if log:
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
                    raise Exception('Invalid data table column header: '+str(e))

            with calculationObject.LogDataDump():
                tb.PrintRows(0, 5)
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
        except Exception as autoscanerror:
            raise Exception('Error while auto-scanning properties from {0}: {1}'.format(
                datafile,
                str(autoscanerror)
            ))

    for property in properties:
        try:
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
            settings.AddTokenIfMissing('MaxLen', 0)
            settings.ConvertStringsToSafeSQL()
            property['DataType'] = settings['DataType']
        except Exception as e:
            errpropertyid = 'unknown'
            if 'propid' in property:
                errpropertyid = property['propid']
            raise Exception('Error while parsing property "{0}": {1}'.format(errpropertyid, str(e)))

    if len(properties) == 0:
        raise Exception('No properties defined. Use "AutoScanProperties: true" or "Properties" list to define')

    if log:
        calculationObject.Log('Properties found:')
    if log:
        with calculationObject.LogDataDump():
            for prop in properties:
                calculationObject.Log(str(prop)+' | '+prop['Settings'].ToJSON())
    for prop in properties:
        DQXUtils.CheckValidColumnIdentifier(prop['propid'])
    return properties

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
        column_type = self.dtype_to_column_type(str(array.dtype))
        sql = "CREATE TABLE `{0}` (`{1}` {2})".format(table_name, column_name, column_type)
        yield lambda cur: cur.execute(sql)
        for start in xrange(0, len(array), 500):
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
    with DQXDbTools.DBCursor(credInfo, datasetId) as cur:
        cur.execute('SELECT count(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = "{0}"'.format(datasetId))
        return cur.fetchone()[0] > 0

