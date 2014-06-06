# This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

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

def positions_from_query(database, table, query, field):
    cur = database.cursor()

    whc=DQXDbTools.WhereClause()
    whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
    whc.Decode(query)
    whc.CreateSelectStatement()

    sqlquery = "SELECT "
    sqlquery += "{0} FROM {1}".format(field, table)
    if len(whc.querystring_params) > 0:
        sqlquery += " WHERE {0} ".format(whc.querystring_params)
    sqlquery += " ORDER BY {0}".format(field)

    print('################################################')
    print('###QRY:'+sqlquery)
    print('###PARAMS:'+str(whc.queryparams))
    print('################################################')
    cur.execute(sqlquery,whc.queryparams)
    cur.execute(sqlquery , whc.queryparams)
    resultlist = cur.fetchall()
    cur.close()
    return resultlist

def response(request_data):
    return request_data
    
def handler(start_response, request_data):
    db = DQXDbTools.OpenDatabase(DQXDbTools.ParseCredentialInfo(request_data), request_data['database'])

    positions = positions_from_query(db,
                                     request_data['tbname'],
                                     request_data['qry'],
                                     request_data['field'])
    key = hashlib.sha224((request_data['database'] +
                          request_data['tbname'] +
                          request_data['qry'] + '_pos')).hexdigest()
    #try:
    #    data = cache[key]
    #except KeyError:
    positions = arraybuffer.encode_array(positions, dtype = 'int32')
    data = gzip(''.join(positions))
    #    cache[key] = data
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(data))),
                        ('Content-Encoding', 'gzip')]
    start_response(status, response_headers)
    yield data
    db.close()



