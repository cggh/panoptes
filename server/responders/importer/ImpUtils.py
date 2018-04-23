# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
import numbers
import os
from itertools import izip, imap
from math import isnan


import config
import uuid
import DQXDbTools
import DQXUtils
import errno
import pymonetdb.control

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
        'Boolean': 'boolean',
        'GeoLatitude': 'real',
        'GeoLongitude': 'real',
        'Date': 'timestamp',
        'GeoJSON': 'text'
    }[dataType]

def GetTempFileName():
    #Check tgethe temp dir exists and then return a new file name in it
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
    control = pymonetdb.control.Control(passphrase='monetdb')
    datasets = [db['name'] for db in control.status()]
    return datasetId in datasets

def valueToString(value):
    if isinstance(value, numbers.Number) and isnan(value):
        return ''
    return str(value)


def tabFileFromHDF5(settings, file):
    arrays = {}
    try:
        import h5py
    except:
        raise Exception("h5py not installed - run 'source panoptes_virtualenv/bin/activate; pip install h5py")
    with h5py.File(file, 'r') as h5:
        path = settings['hdfPath']
        props = settings['properties']
        for prop in props:
            arrays[prop['id']] = h5[path][prop['id']]
        array_length = arrays[props[0]['id']].shape[0]
        if any(array.shape[0] is not array_length for array in arrays.values()):
            raise Exception('HDF5 arrays are not all same size')
        outFileName = GetTempFileName()
        with open(outFileName, 'w') as outFile:
            outFile.write('\t'.join(arrays))
            outFile.write('\n')
            step_size = 1000
            for start in range(0, array_length, step_size):
                end = min(start + step_size, array_length)
                for line in izip(*[array[start:end] for array in arrays.values()]):
                    outFile.writelines('\t'.join(imap(valueToString, line))+'\n')
    return outFileName
