from __future__ import absolute_import
# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
from builtins import zip
from builtins import str
from builtins import map
import json

import DQXDbTools
import DQXUtils
import arraybuffer
import numpy as np

from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
from DQXDbTools import desciptionToDType

import config
from cache import getCache
from .columnDecode import decode, name
from .gzipstream import gzip
from dates import datetimeToJulianDay

NULL_VALUES = {
    'i1': -128,
    'i2': -32768,
    'i4': -2147483648,
    'S': '',
    'timestamp': None
}

def response(requestData):
    return requestData


def handler(start_response, requestData):
    try:
        length = int(requestData['environ'].get('CONTENT_LENGTH', '0'))
    except ValueError:
        length = 0
    content = requestData['environ']['wsgi.input'].read(length).decode("utf-8")
    content = json.loads(content) if len(content) > 0 else None
    if not content:
        raise SyntaxError('No query parameters supplied')
    tableId = content['table']
    query = content['query']
    orderBy = json.loads(content.get('orderBy', '[]'))
    distinct = content.get('distinct', 'false') == 'true'
    rawColumns = json.loads(content['columns'])
    columns = list(map(decode, rawColumns))
    groupBy = content.get('groupBy', None)
    database = content['database']
    startRow, endRow = None, None
    if content.get('limit', False):
        startRow, endRow = content['limit'].split('~')
        startRow = int(startRow)
        endRow = int(endRow)
        if startRow < 0:
            startRow = 0
        if endRow <= startRow:
            endRow = startRow + 1
    randomSample = None
    if content.get('randomSample', False):
        randomSample = int(content['randomSample'])
    cacheData = content.get('cache', True)
    joins = json.loads(content.get('joins', '[]'))
    cache = getCache()
    cacheKey = json.dumps([tableId, query, orderBy, distinct, columns, groupBy, database, startRow, endRow])
    data = None
    if cacheData and randomSample is None: #Don't serve cache on random sample!!
        try:
            data = cache[cacheKey]
        except KeyError:
            pass

    if data is None:
        with DQXDbTools.DBCursor(requestData, database, read_timeout=config.TIMEOUT) as cur:
            whereClause = DQXDbTools.WhereClause()
            whereClause.ParameterPlaceHolder = '%s'
            whereClause.Decode(query, True)
            whereClause.CreateSelectStatement()
            sqlQuery = "SELECT "
            if distinct:
                sqlQuery += " DISTINCT "
            sqlQuery += "{0} FROM {1}".format(','.join(columns), DBTBESC(tableId))
            for join in joins:
                if 'type' in join and join['type'] in ['', 'INNER', 'LEFT', 'RIGHT', 'FULL']:
                    sqlQuery += " {0} JOIN {1} ON {2} = {3}".format(join['type'].upper(), DBTBESC(join['foreignTable']), DBCOLESC(join['foreignColumn']), DBCOLESC(join['column']))
                else:
                    raise SyntaxError('Join type not valid')
            if len(whereClause.querystring_params) > 0:
                sqlQuery += " WHERE {0}".format(whereClause.querystring_params)
            if groupBy and len(groupBy) > 0:
                sqlQuery += " GROUP BY " + ','.join(map(DBCOLESC, groupBy.split('~')))
            if len(orderBy) > 0:
                sqlQuery += " ORDER BY {0}".format(','.join([DBCOLESC(col) + ' ' + direction for direction, col in orderBy]))
            if startRow is not None and endRow is not None:
                sqlQuery += " LIMIT {0} OFFSET {1}".format(endRow-startRow+1, startRow)
            if randomSample is not None:
                sqlQuery += " SAMPLE {0}".format(randomSample)

            if DQXDbTools.LogRequests:
                DQXUtils.LogServer('###QRY:'+sqlQuery)
                DQXUtils.LogServer('###PARAMS:'+str(whereClause.queryparams))
            cur.execute(sqlQuery, whereClause.queryparams)
            rows = cur.fetchall()
            result = {}
            for rawCol, (i, desc) in zip(rawColumns, enumerate(cur.description)):
                #Figure out the name we should return for the column - by deafult monet doesn't qualify names
                col_name = name(rawCol, desc[0])
                dtype = desciptionToDType(desc[1])
                if dtype in ['i1', 'i2', 'i4', 'S']:
                    null_value = NULL_VALUES[dtype]
                    result[col_name] = np.array([(row[i].encode('ascii', 'replace') if dtype == 'S' else row[i]) if row[i] is not None else null_value for row in rows], dtype=dtype)
                elif desc[1] == 'timestamp':
                    result[col_name] = np.array([datetimeToJulianDay(row[i]) if row[i] is not None else None for row in rows], dtype=dtype)
                else:
                    result[col_name] = np.array([row[i] for row in rows], dtype=dtype)
            data = gzip(data=b''.join(arraybuffer.encode_array_set(list(result.items()))))
            if cacheData:
                cache[cacheKey] = data
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(data))),
                        ('Content-Encoding', 'gzip'),
                        ('Access-Control-Allow-Origin', '*')
                        ]
    start_response(status, response_headers)
    yield data
