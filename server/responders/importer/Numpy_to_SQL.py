from builtins import str
from builtins import range
from builtins import object
import re
import numpy

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
        for key, func in list(func_convert.items()):
            if re.search('^' + key + '$', dtype) is not None:
                return func(dtype)
        for i, o in list(simple_conversion.items()):
            if dtype == i:
                return o
        raise ValueError('Unknown dtype:' + dtype)

    #Currently assumes simple 1D
    def create_table(self, table_name, column_name, array):
        column_type = self.dtype_to_column_type(str(array.dtype))
        sql = 'CREATE TABLE "{0}" ("{1}" {2})'.format(table_name, column_name, column_type)
        yield lambda cur: cur.execute(sql)
        for start in range(0, len(array), 500):
            end = min(start + 500, len(array))
            sql = 'INSERT INTO "{0}" ("{1}") VALUES (%s)'.format(table_name, column_name)
            data = [line.decode('utf-8') for line in array[start: end].tolist()]
            yield lambda cur: cur.executemany(sql,
                                              data)
