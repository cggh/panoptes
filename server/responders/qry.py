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

    myposfield = DQXDbTools.ToSafeIdentifier(returndata['posfield'])
    mytablename = DQXDbTools.ToSafeIdentifier(returndata['tbname'])
    encodedquery = returndata['qry']
    myorderfield = DQXDbTools.ToSafeIdentifier(returndata['order'])
    # DQXUtils.LogServer('orderfield: '+myorderfield)

    mycolumns=DQXDbTools.ParseColumnEncoding(lzstring.decompressFromEncodedURIComponent(returndata['collist']))

    databaseName = None
    if 'database' in returndata:
        databaseName = returndata['database']
    with DQXDbTools.DBCursor(returndata, databaseName, read_timeout=config.TIMEOUT) as cur:
        whc=DQXDbTools.WhereClause()
        whc.ParameterPlaceHolder = '%s' #NOTE!: MySQL PyODDBC seems to require this nonstardard coding
        whc.Decode(encodedquery)
        whc.CreateSelectStatement()

        sqlquery="SELECT {posfield}, {columnames} FROM {tablename}".format(
            posfield=DBCOLESC(myposfield),
            columnames=','.join([DBCOLESC(x['Name']) for x in mycolumns]),
            tablename=DBTBESC(mytablename)
        )

        if len(whc.querystring_params) > 0:
            sqlquery += " WHERE {0}".format(whc.querystring_params)

        if len(myorderfield) > 0:
            sqlquery += " ORDER BY {0}".format(DBCOLESC(myorderfield))

        if DQXDbTools.LogRequests:
            DQXUtils.LogServer('###QRY:'+sqlquery)
            DQXUtils.LogServer('###PARAMS:'+str(whc.queryparams))
        cur.execute(sqlquery, whc.queryparams)

        returndata['DataType'] = 'Points'
        pointsx = []
        yvalrange=range(0, len(mycolumns))
        pointsy = []
        for ynr in yvalrange:
            pointsy.append([])
        for row in cur.fetchall():
            pointsx.append(float(row[0]))
            for ynr in yvalrange:
                if row[1+ynr] != None:
                    pointsy[ynr].append(row[1+ynr])
                else:
                    pointsy[ynr].append(None)

        valcoder = B64.ValueListCoder()
        returndata['XValues'] = valcoder.EncodeIntegersByDifferenceB64(pointsx)
        for ynr in yvalrange:
            returndata[mycolumns[ynr]['Name']] = valcoder.EncodeByMethod(pointsy[ynr], mycolumns[ynr]['Encoding'])

        return returndata
