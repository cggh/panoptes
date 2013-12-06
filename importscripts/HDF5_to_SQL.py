#!/usr/bin/python
import MySQLdb
import h5py
import re
import progressbar as pb
import numpy

widgets = ['Load table:', ' ', pb.Percentage(), ' ', pb.Counter(), ' ', pb.Bar(marker=pb.RotatingMarker()),
           ' ', pb.ETA(), ' ', pb.FileTransferSpeed()]

f = h5py.File("/home/benj/data/ag/gatk_ug-subset_A_combined_chrom.h5")

db = MySQLdb.connect(host="localhost",
                     user="root",
                     passwd="1234",
                     db="ag_subset_A")
table = "SNP"
cur = db.cursor()


def dtype_to_column_type(dtype):
    start = dtype
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

def sanitise(row):
    return tuple(int(b) if type(b) == numpy.bool_ else b for b in row)

hdf_table = f['variants']

names = [name.lower() if name in ['CHROM', 'POS'] else name for name, dtype in hdf_table.dtype.descr]
types = [dtype_to_column_type(dtype) for name, dtype in hdf_table.dtype.descr]
columns = ['`idx` SERIAL', ]
columns += ['`{0}` {1}'.format(name, typ) for name, typ in zip(names, types)]
columns = ','.join(columns)

cur.execute("DROP TABLE IF EXISTS %s" % (table,))
cur.execute("CREATE TABLE `%s` (%s)" % (table, columns))

subs = ','.join(['%s ' for name in names])
names = ','.join(names)

pbar = pb.ProgressBar(widgets=widgets, maxval=len(hdf_table)).start()
step_size = 500
for start in range(0, len(hdf_table), step_size):
    end = min(start + step_size, len(hdf_table))
    cur.executemany("INSERT INTO "+table+" (" + names + ") VALUES (" + subs + ")",
                    map(sanitise, hdf_table[start: end]))
    db.commit()
    pbar.update(end)
pbar.finish()
cur.close()
db.close()

