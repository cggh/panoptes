from DQXDbTools import DBCOLESC

decoders = {
}

for _op in ['/', '+', '-', '*']:
    decoders[_op] = (lambda op: lambda a, b: _decode(a) + op + _decode(b))(_op)
for _op in ['count', 'max', 'min', 'avg']:
    decoders[_op] = (lambda op: lambda a: op + '(' + _decode(a) + ')')(_op)
for _op in ['median', 'stddev_samp', 'stddev_pop', 'var_samp', 'var_pop']:
    #For some reason these need a prefix
    decoders[_op] = (lambda op: lambda a: 'sys.' + op + '(' + _decode(a) + ')')(_op)
for _op in ['qualtile', 'corr']:
    decoders[_op] = (lambda op: lambda a,b: 'sys.' + op + '(' + _decode(a) + ',' + _decode(b) + ')')(_op)

def _decode(column):
    if isinstance(column, (str, unicode)):
        return DBCOLESC(column)
    elif isinstance(column, (int, float)):
        return str(column)
    elif isinstance(column, (list, tuple)):
        return decoders[column[0]](*column[1])

def decode(column):
    if isinstance(column, (str, unicode, int, float, list, tuple)):
        return _decode(column)
    elif isinstance(column, object):
        return _decode(column['expr']) + ' AS ' + DBCOLESC(column['as'])
