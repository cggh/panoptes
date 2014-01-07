import DQXDbTools
from file_dict import FileDict
from struct import pack
import StringIO
from gzip import GzipFile
from itertools import islice, takewhile
from operator import ne
from functools import partial
import hashlib
import arraybuffer
import numpy as np

#TODO cache doesn't have locking....
cache = FileDict('cache')

def gzip(data):
    out = StringIO.StringIO()
    f = GzipFile(fileobj=out, mode='w')
    f.write(data)
    f.close()
    return out.getvalue()

def positions_from_query(database, table, query):
    db = DQXDbTools.OpenDatabase(database)
    cur = db.cursor()

    whc=DQXDbTools.WhereClause()
    whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
    whc.Decode(query)
    whc.CreateSelectStatement()

    sqlquery = "SELECT "
    sqlquery += "pos FROM {0}".format(table)
    if len(whc.querystring_params)>0:
        sqlquery += " WHERE {0} ORDER BY pos".format(whc.querystring_params)
    print('################################################')
    print('###QRY:'+sqlquery)
    print('###PARAMS:'+str(whc.queryparams))
    print('################################################')
    cur.execute(sqlquery,whc.queryparams)
    resultlist = cur.fetchall()
    cur.close()
    db.close()
    return np.array(resultlist, dtype = 'int32')

def response(request_data):
    return request_data
    
def handler(start_response, request_data):
    positions = positions_from_query(request_data['database'], 
                                     request_data['tbname'],
                                     request_data['qry'])
    key = hashlib.sha224((request_data['database'] + 
                          request_data['tbname'] +
                          request_data['qry'] + '_pos')).hexdigest()
    #try:
    #    data = cache[key]
    #except KeyError:
    positions = arraybuffer.encode_array(positions)
    data = gzip(''.join(positions))
    #    cache[key] = data
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(data))),
                        ('Content-Encoding', 'gzip')]
    start_response(status, response_headers)
    yield data



