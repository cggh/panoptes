# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import B64
import DQXDbTools
import DQXUtils
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
import config
import lzstring


def response(returndata):
    mytablename = returndata['tbname']
    encodedquery = returndata['qry']
    myorderfield = returndata.get('order', None)
    sortreverse = int(returndata['sortreverse']) > 0
    isdistinct = ('distinct' in returndata) and (int(returndata['distinct']) > 0)
    mycolumns=DQXDbTools.ParseColumnEncoding(lzstring.decompressFromEncodedURIComponent(returndata['collist']))
    groupby = returndata.get('groupby', None)

    databaseName=None
    if 'database' in returndata:
        databaseName = returndata['database']
    with DQXDbTools.DBCursor(returndata, databaseName, read_timeout=config.TIMEOUT) as cur:
        whc=DQXDbTools.WhereClause()
        whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
        whc.Decode(encodedquery)
        whc.CreateSelectStatement()

        #Determine total number of records
        if int(returndata['needtotalcount'])>0:
            sqlquery = "SELECT COUNT(*) FROM {0}".format(DBTBESC(mytablename))
            if len(whc.querystring_params) > 0:
                sqlquery += " WHERE {0}".format(whc.querystring_params)
            DQXUtils.LogServer('   executing count query...')
            tm = DQXUtils.Timer()
            cur.execute(sqlquery, whc.queryparams)
            DQXUtils.LogServer('   finished in {0}s'.format(tm.Elapsed()))
            returndata['TotalRecordCount'] = cur.fetchone()[0]

        #Fetch the actual data
        strrownr1, strrownr2 = returndata['limit'].split('~')
        rownr1 = int(0.5+float(strrownr1))
        rownr2 = int(0.5+float(strrownr2))
        if rownr1 < 0:
            rownr1 = 0
        if rownr2 <= rownr1:
            rownr2 = rownr1+1

        #sqlquery = "select benchmark(9999999999, md5('when will it end?')); SELECT "
        sqlquery = "SELECT "
        if isdistinct:
            sqlquery = "SELECT DISTINCT "
        sqlquery += "{0} FROM {1}".format(','.join([DBCOLESC(x['Name']) for x in mycolumns]), DBTBESC(mytablename))
        if len(whc.querystring_params) > 0:
            sqlquery += " WHERE {0}".format(whc.querystring_params)
        if myorderfield and len(myorderfield) > 0 and myorderfield != 'null':
            sqlquery += " ORDER BY {0}".format(DQXDbTools.CreateOrderByStatement(myorderfield, sortreverse))

        if groupby and len(groupby) > 0:
            sqlquery += " GROUP BY " + ','.join(map(DBCOLESC, groupby.split('~')))
        sqlquery += " LIMIT {0} OFFSET {1}".format(rownr2-rownr1+1, rownr1)

        if DQXDbTools.LogRequests:
            DQXUtils.LogServer('###QRY:'+sqlquery)
            DQXUtils.LogServer('###PARAMS:'+str(whc.queryparams))

        cur.execute(sqlquery, whc.queryparams)

        returndata['DataType'] = 'Points'
        pointsx = []
        yvalrange = range(0, len(mycolumns))
        pointsy = []
        for ynr in yvalrange:
            pointsy.append([])
        rowidx = 0
        for row in cur.fetchall():
            pointsx.append(rownr1+rowidx)
            for ynr in yvalrange:
                if row[ynr] != None:
                    pointsy[ynr].append(row[ynr])
                else:
                    pointsy[ynr].append(None)
            rowidx += 1

        valcoder = B64.ValueListCoder()
        returndata['XValues'] = valcoder.EncodeIntegersByDifferenceB64(pointsx)
        for ynr in yvalrange:
            returndata[mycolumns[ynr]['Name']] = valcoder.EncodeByMethod(pointsy[ynr], mycolumns[ynr]['Encoding'])

        return returndata
