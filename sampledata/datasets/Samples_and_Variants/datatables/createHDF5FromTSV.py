import csv

import h5py
import numpy
import yaml
from os import path

table = 'variants'
hdf5Types = {
        'Text': 'S256',
        'Float': numpy.float32,
        'Double': numpy.float64,
        'Int8': numpy.int8,
        'Int16': numpy.int16,
        'Int32': numpy.int32,
        'Boolean': bool,
        'GeoLatitude': numpy.float32,
        'GeoLongitude': numpy.float32,
        'Date': 'M'
    }

#Load the JSON settings for this table
with open(path.join(table, 'settings'), 'r') as settingsFile:
    settings = yaml.load(settingsFile)

with open(path.join(table, 'data'), 'r') as tabfile:
    reader = csv.DictReader(tabfile, delimiter='\t')
    rows = list(reader)
    columns = {key: [row[key] for row in rows] for key in rows[0].keys()}

f = h5py.File(path.join(table+'_hdf5', 'data.hdf5'), 'w')
grp = f.create_group(table)
for propConfig in settings['properties']:
    ids = propConfig['id'].split(', ')
    if 'dataType' not in propConfig:
        continue
    for id in ids:
        try:
            data = columns[id]
        except:
            data = columns[id.replace('_', ' ')]
        type = propConfig['dataType']
        if 'Int' in type:
            data = [d if d != '' else '0' for d in data]  #As this is only example data we can do this - numpy doesn't support NaN in int types
        if 'Boolean' in type:
            data = [1 if d == 'True' else 0 for d in data]  #As this is only example data we can do this - numpy doesn't support NaN in int types
        if 'Float' in type:
            data = [None if d == '' else d for d in data]
        data = numpy.array(data)
        type = hdf5Types[type]
        data = data.astype(type)
        grp.create_dataset(id, data=data)
f.close()