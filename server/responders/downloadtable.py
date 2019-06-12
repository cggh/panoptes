# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from past.builtins import basestring
import DQXDbTools
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
import config
from lzstring import LZString
import json
import DQXUtils

def response(returndata):

    tableId = returndata['table']
    query = returndata['query']
    columns = DQXDbTools.ParseColumnEncoding(LZString.decompressFromEncodedURIComponent(returndata['columns']))
    database = None
    orderBy = None

    if 'database' in returndata:
        database = returndata['database']

    if 'orderBy' in returndata:
        orderBy = json.loads(returndata['orderBy'])

    auth_query = DQXDbTools.CredentialInformation(returndata).get_auth_query(database, [tableId])

    #Auth is checked when this context is entered
    with DQXDbTools.DBCursor(returndata, database, read_timeout = config.TIMEOUT) as cur:
        whc = DQXDbTools.WhereClause()
        whc.ParameterPlaceHolder = '%s' # NOTE: MySQL PyODDBC seems to require this nonstardard coding
        whc.Decode(query)
        if auth_query:
            whc.query = {
                "whcClass": "compound",
                "isCompound": True,
                "isRoot": True,
                "Components": [
                    whc.query,
                    auth_query
                ],
                "Tpe": "AND"
            }
        whc.CreateSelectStatement()
        sqlquery = "SELECT {0} FROM {1}" . format(','.join([DBCOLESC(x['Name']) for x in columns]), DBTBESC(tableId))
        if len(whc.querystring_params) > 0:
            sqlquery += " WHERE {0}" . format(whc.querystring_params)
        if orderBy is not None:
            sqlquery += " ORDER BY {0}" . format(','.join([DBCOLESC(col) + ' ' + direction for direction, col in orderBy]))
        print(sqlquery)
        cur.execute(sqlquery, whc.queryparams)
        yield b'\t'.join(col[0].encode('ascii', 'replace') for col in cur.description) + b'\n'
        for row in cur.fetchall() :
            line = b'\t'.join([str(x).encode('ascii', 'replace') for x in row]) + b'\n'
            yield line
        if DQXDbTools.LogRequests:
            DQXUtils.LogServer('###QRY:' + sqlquery)
            DQXUtils.LogServer('###PARAMS:' + str(whc.queryparams))


def handler(start_response, response):
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain'), ('Content-Disposition','attachment; filename=download.txt')]
    start_response(status, response_headers)
    for item in response:
        yield item
