# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import config
import uuid
import DQXDbTools
import DQXUtils
import errno
import monetdb.control

def convertToBooleanInt(vl):
    if vl is None:
        return None
    if (vl.lower() == 'true') or (vl.lower() == 'yes') or (vl.lower() == 'y') or (vl == '1') or (vl == '1.0'):
        return 1
    if (vl.lower() == 'false') or (vl.lower() == 'no') or (vl.lower() == 'n') or (vl == '0') or (vl == '0.0'):
        return 0
    return None

def GetSQLDataType(dataType):
    return {
        'Text': 'text',
        'Float': 'real',
        'Double': 'double',
        'Int8': 'tinyint',
        'Int16': 'smallint',
        'Int32': 'int',
        'Int64': 'bigint',
        'Boolean': 'boolean',
        'GeoLatitude': 'real',
        'GeoLongitude': 'real',
        'Date': 'timestamp'
    }[dataType]

def GetTempFileName():
    #Check the temp dir exists and then return a new file name in it
    temp_dir = os.path.join(config.BASEDIR,'temp')
    try:
        os.makedirs(temp_dir)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise
    return os.path.join(temp_dir, 'TMP'+str(uuid.uuid1()).replace('-', '_'))


def RunConvertor(calculationObject, name, runpath, arguments):
    path_DQXServer = DQXUtils.GetDQXServerPath()
    scriptFile = os.path.join(path_DQXServer, 'Convertors', name + '.py')
    calculationObject.RunPythonScript(scriptFile, runpath, arguments)



def mkdir(name):
    try:
        os.makedirs(name)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise


def IsDatasetPresentInServer(credInfo, datasetId):
    control = monetdb.control.Control(passphrase='monetdb')
    datasets = [db['name'] for db in control.status()]
    return datasetId in datasets
