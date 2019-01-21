from builtins import str
from DQXDbTools import DBCOLESC

decoders = {
}

for _op in ['/', '+', '-', '*']:
    decoders[_op] = (lambda op: lambda a, b: _decode(a) + op + _decode(b))(_op)
for _op in ['count', 'max', 'min', 'avg', 'distinct']:
    decoders[_op] = (lambda op: lambda a: op + '(' + _decode(a) + ')')(_op)
for _op in ['median', 'stddev_samp', 'stddev_pop', 'var_samp', 'var_pop']:
    #For some reason these need a prefix
    decoders[_op] = (lambda op: lambda a: 'sys.' + op + '(' + _decode(a) + ')')(_op)
for _op in ['qualtile', 'corr', 'sql_min', 'sql_max']:
    decoders[_op] = (lambda op: lambda a,b: 'sys.' + op + '(' + _decode(a) + ',' + _decode(b) + ')')(_op)

def _decode(column):
    if isinstance(column, (str, str)):
        return DBCOLESC(column)
    elif isinstance(column, (int, float)):
        return str(column)
    elif isinstance(column, (list, tuple)):
        return decoders[column[0]](*column[1])

def decode(column):
    if isinstance(column, (str, str, int, float, list, tuple)):
        return _decode(column)
    elif isinstance(column, object):
        return _decode(column['expr']) + ' AS ' + DBCOLESC(column['as'])


def name(column, descName):
    if isinstance(column, (str, str)):
        return str(column)
    if isinstance(column, (int, float, list, tuple)):
        return str(descName)
    elif isinstance(column, object):
        return str(column['as'])
