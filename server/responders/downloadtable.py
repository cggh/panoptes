# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
import config
import lzstring
import json


def response(response):
    mytablename = response['tbname']
    encodedquery = response['qry']
    #columnOrders = response['order']
    mycolumns = DQXDbTools.ParseColumnEncoding(lzstring.decompressFromEncodedURIComponent(response['collist']))
    databaseName = None
    if 'database' in response:
        databaseName = response['database']
    with DQXDbTools.DBCursor(response, databaseName, read_timeout = config.TIMEOUT) as cur:
        whc=DQXDbTools.WhereClause()
        whc.ParameterPlaceHolder = '%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
        whc.Decode(encodedquery)
        whc.CreateSelectStatement()
        #orderBy = json.loads(columnOrders, '[]')
        sqlquery="SELECT {0} FROM {1}".format(','.join([DBCOLESC(x['Name']) for x in mycolumns]), DBTBESC(mytablename))
        if len(whc.querystring_params) > 0:
            sqlquery+=" WHERE {0}".format(whc.querystring_params)
        # sqlquery+=" ORDER BY {0}".format(DQXDbTools.CreateOrderByStatement(myorderfield, sortreverse))
        # if len(orderBy) > 0:
        #     sqlQuery += " ORDER BY {0}".format(','.join([DBCOLESC(col) + ' ' + direction for direction, col in orderBy]))
        cur.execute(sqlquery, whc.queryparams)
        yield '\t'.join(str(col[0]) for col in cur.description)+'\n'
        for row in cur.fetchall() :
            line='\t'.join([str(x) for x in row])+'\n'
            yield line
        if DQXDbTools.LogRequests:
            DQXUtils.LogServer('###QRY:' + sqlQuery)
            DQXUtils.LogServer('###PARAMS:' + str(whc.queryparams))
            #DQXUtils.LogServer('###ORDER:' + str(columnOrders))


def handler(start_response, response):
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain'),('Content-Disposition','attachment; filename=download.txt')]
    start_response(status, response_headers)
    for item in response:
        yield item
