# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import B64
import DQXDbTools
import DQXUtils
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
import config


def response(returndata):
    mytablename=returndata['tbname']
    encodedquery=returndata['qry']

    maxrecordcount = 10000
    if 'maxrecordcount' in returndata:
        maxrecordcount = int(returndata['maxrecordcount'])

    databaseName=None
    if 'database' in returndata:
        databaseName = returndata['database']

    with DQXDbTools.DBCursor(returndata, databaseName, read_timeout=config.TIMEOUT) as cur:
        whc=DQXDbTools.WhereClause()
        whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
        whc.Decode(encodedquery)
        whc.CreateSelectStatement()


        #Determine total number of records
        sqlquery="SELECT COUNT(*) FROM (SELECT * FROM {0}".format(DBTBESC(mytablename))
        if len(whc.querystring_params) > 0:
            sqlquery += " WHERE {0}".format(whc.querystring_params)
        #Subquery limits not supported in monet
        # sqlquery += ' LIMIT '+str(maxrecordcount)
        sqlquery += ') as tmp_table'
        # DQXUtils.LogServer('   executing count query...')
        tm = DQXUtils.Timer()

        if DQXDbTools.LogRequests:
            DQXUtils.LogServer('###QRY:'+sqlquery)
            DQXUtils.LogServer('###PARAMS:'+str(whc.queryparams))
        cur.execute(sqlquery, whc.queryparams)
        # DQXUtils.LogServer('   finished in {0}s'.format(tm.Elapsed()))
        recordcount = cur.fetchone()[0]
        returndata['TotalRecordCount'] = recordcount
        if recordcount >= maxrecordcount:
            returndata['Truncated'] = True

        return returndata
