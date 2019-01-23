from __future__ import division
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from past.utils import old_div
import DQXDbTools
import B64
import math
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
import config


def response(returndata):
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    propid = DQXDbTools.ToSafeIdentifier(returndata['propid'])
    maxrecordcount = int(returndata['maxrecordcount'])
    encodedquery = returndata['qry']

    whc=DQXDbTools.WhereClause()
    whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
    whc.Decode(encodedquery)
    whc.CreateSelectStatement()

    with DQXDbTools.DBCursor(returndata, databaseName, read_timeout=config.TIMEOUT) as cur:
        coder = B64.ValueListCoder()

        querystring = " ({0} is not null)".format(DBCOLESC(propid))
        if len(whc.querystring_params) > 0:
            querystring += " AND ({0})".format(whc.querystring_params)

        if 'binsize' in returndata:
            binsize=float(returndata['binsize'])
        else:
            #Automatically determine bin size
            sql = 'select min({propid}) as _mn, max({propid}) as _mx, count(*) as _cnt from (select {propid} from {tableid} WHERE {querystring} limit {maxrecordcount}) as tmplim'.format(
                propid=DBCOLESC(propid),
                tableid=DBTBESC(tableid),
                querystring=querystring,
                maxrecordcount=maxrecordcount
            )
            cur.execute(sql, whc.queryparams)
            rs = cur.fetchone()
            minval = rs[0]
            maxval = rs[1]
            count  = rs[2]
            if (minval is None) or (maxval is None) or (count == 0):
                returndata['hasdata'] = False
                return returndata
            if maxval == minval:
                maxval = minval + 1.0e-9
            jumpPrototypes = [1, 2, 5]
            optimalbincount = int(math.sqrt(count))
            optimalbincount = max(optimalbincount, 2)
            optimalbincount = min(optimalbincount, 200)
            optimalbinsize = old_div((maxval-minval)*1.0,optimalbincount)
            mindist = 1.0e99
            binsize = 1
            for jumpPrototype in jumpPrototypes:
                q=math.floor(math.log10(old_div(optimalbinsize,jumpPrototype)))
                TryJump1A = math.pow(10, q) * jumpPrototype
                TryJump1B = math.pow(10, q + 1) * jumpPrototype
                if abs(TryJump1A - optimalbinsize) < mindist:
                    mindist = abs(TryJump1A - optimalbinsize)
                    binsize = TryJump1A
                if abs(TryJump1B - optimalbinsize) < mindist:
                    mindist = abs(TryJump1B - optimalbinsize)
                    binsize = TryJump1B


        returndata['hasdata']=True
        returndata['binsize'] = binsize


        maxbincount = 5000
        buckets = []
        counts = []
        totalcount = 0
        sql = 'select floor({0}/{1}) as bucket, count(*) as _cnt'.format(DBCOLESC(propid), binsize)
        sql += ' FROM (SELECT {1} FROM {0} '.format(DBTBESC(tableid), DBCOLESC(propid))
        sql += " WHERE {0}".format(querystring)
        sql += ' limit {0})  as tmplim'.format(maxrecordcount)
        sql += ' group by bucket'
        sql += ' limit {0}'.format(maxbincount)
        cur.execute(sql, whc.queryparams)
        for row in cur.fetchall():
            if row[0] is not None:
                buckets.append(row[0])
                counts.append(row[1])
                totalcount += row[1]

            if len(buckets) >= maxbincount:
                returndata['Error'] = 'Too many bins in dataset'

            if totalcount >= maxrecordcount:
                returndata['Warning'] = 'Number of data points exceeds the limit of {0}.\nData has been truncated'.format(maxrecordcount)

            returndata['buckets'] = coder.EncodeIntegers(buckets)
            returndata['counts'] = coder.EncodeIntegers(counts)

        return returndata
