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
from DQXTableUtils import VTTable
import customresponders.panoptesserver.Utils as Utils
import simplejson
import copy

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

