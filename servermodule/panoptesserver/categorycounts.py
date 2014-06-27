# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import B64
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
import config


def response(returndata):
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    propid1 = DQXDbTools.ToSafeIdentifier(returndata['propid1'])
    maxrecordcount = int(returndata['maxrecordcount'])
    encodedquery = returndata['qry']

    propid2 = None
    if 'propid2' in returndata:
        propid2 = DQXDbTools.ToSafeIdentifier(returndata['propid2'])

    whc = DQXDbTools.WhereClause()
    whc.ParameterPlaceHolder = '%s' #NOTE!: MySQL PyODDBC seems to require this nonstardard coding
    whc.Decode(encodedquery)
    whc.CreateSelectStatement()


    with DQXDbTools.DBCursor(returndata, databaseName, read_timeout=config.TIMEOUT) as cur:
        coder = B64.ValueListCoder()

        if propid2 is None:
            categories1 = []
            categorycounts = []
            sourcetable = 'select {1} from {0}'.format(DBTBESC(tableid), DBCOLESC(propid1))
            if len(whc.querystring_params) > 0:
                sourcetable += " WHERE {0}".format(whc.querystring_params)
            sourcetable += ' limit {0}'.format(maxrecordcount)
            sql = 'select {1}, count({1}) as _cnt from ({0}) as tmp_table'.format(sourcetable, DBCOLESC(propid1))
            sql += ' group by {1} order by _cnt desc limit 10000;'.format(DBTBESC(tableid), DBCOLESC(propid1))
            cur.execute(sql, whc.queryparams)
            totalcount = 0
            for row in cur.fetchall():
                categories1.append(row[0])
                categorycounts.append(row[1])
                totalcount += row[1]

            returndata['categories1'] = coder.EncodeGeneric(categories1)
            returndata['categorycounts'] = coder.EncodeIntegers(categorycounts)

            if totalcount >= maxrecordcount:
                returndata['Warning'] = 'Number of data points exceeds the limit of {0}.\nData has been truncated'.format(maxrecordcount)

        else:

            categories1 = []
            categories2 = []
            categorycounts = []
            sourcetable = 'select {1}, {2} from {0}'.format(DBTBESC(tableid), DBCOLESC(propid1), DBCOLESC(propid2), maxrecordcount)
            if len(whc.querystring_params) > 0:
                sourcetable += " WHERE {0}".format(whc.querystring_params)
            sourcetable +=  ' limit {0}'.format(maxrecordcount)
            sql = 'select {1}, {2}, count({1}) as _cnt from ({0}) as tmp_table'.format(sourcetable, DBCOLESC(propid1), DBCOLESC(propid2))
            sql += ' group by {1}, {2} limit 10000;'.format(DBTBESC(tableid), DBCOLESC(propid1), DBCOLESC(propid2))
            cur.execute(sql, whc.queryparams)
            totalcount = 0
            for row in cur.fetchall():
                categories1.append(row[0])
                categories2.append(row[1])
                categorycounts.append(row[2])
                totalcount += row[2]

            returndata['categories1'] = coder.EncodeGeneric(categories1)
            returndata['categories2'] = coder.EncodeGeneric(categories2)
            returndata['categorycounts'] = coder.EncodeIntegers(categorycounts)

            if totalcount >= maxrecordcount:
                returndata['Warning'] = 'Number of data points exceeds the limit of {0}.\nData has been truncated'.format(maxrecordcount)


        return returndata
