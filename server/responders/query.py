# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
import json

import B64
import DQXDbTools
import DQXUtils
import numpy as np
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
import config
import DQXbase64
from columnDecode import decode
from DQXDbTools import desciptionToDType
import arraybuffer
from gzipstream import gzip

def response(requestData):
    return requestData

def handler(start_response, requestData):
    try:
        length = int(requestData['environ'].get('CONTENT_LENGTH', '0'))
    except ValueError:
        length = 0
    content = requestData['environ']['wsgi.input'].read(length)
    content = json.loads(content) if len(content) > 0 else None
    if not content:
        raise SyntaxError('No query parameters supplied')
    
    tableId = content['table']
    query = content['query']
    orderBy = json.loads(content.get('orderBy', '[]'))
    distinct = content.get('distinct', 'false') == 'true'
    columns = map(decode, json.loads(content['columns']))
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

    with DQXDbTools.DBCursor(requestData, database, read_timeout=config.TIMEOUT) as cur:
        whereClause = DQXDbTools.WhereClause()
        whereClause.ParameterPlaceHolder = '%s'
        whereClause.Decode(query, True)
        whereClause.CreateSelectStatement()

        sqlQuery = "SELECT "
        if distinct:
            sqlQuery += " DISTINCT "
        sqlQuery += "{0} FROM {1}".format(','.join(columns), DBTBESC(tableId))
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
        for i, desc in enumerate(cur.description):
            dtype = desciptionToDType(desc)
            result[desc[0]] = np.array([row[i] for row in rows], dtype=dtype)
        data = gzip(data=''.join(arraybuffer.encode_array_set(result.items())))
        status = '200 OK'
        response_headers = [('Content-type', 'text/plain'),
                            ('Content-Length', str(len(data))),
                            ('Content-Encoding', 'gzip'),
                            ('Access-Control-Allow-Origin', '*')
                            ]
        start_response(status, response_headers)
        yield data
