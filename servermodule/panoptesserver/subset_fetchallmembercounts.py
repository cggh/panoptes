# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
from DQXDbTools import DBTBESC




# Returns the number of data items in all subsets for a given table

def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])

    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationRead(databaseName, 'storedsubsets'))

        cur.execute('SELECT id FROM tablecatalog')
        tableList = [row[0] for row in cur.fetchall()]

        maxcount = 50000

        resultInfo = {}
        for table in tableList:
            resultInfo[table] = {}
            cur.execute('SELECT subsetid FROM storedsubsets WHERE tableid="{0}"'.format(table))
            subsetList = [row[0] for row in cur.fetchall()]
            for subset in subsetList:
                subsetMemberTable = table+'_subsets'
                cur.execute('SELECT count(*) FROM (SELECT * FROM {membertable} WHERE subsetid={subsetid} LIMIT {maxcount}) AS _tmptable_'.format(
                    membertable=DBTBESC(subsetMemberTable),
                    subsetid=subset,
                    maxcount=maxcount+1
                ))
                count = int(cur.fetchone()[0])
                resultInfo[table][subset] = count

    returndata['info'] = resultInfo
    returndata['maxcount'] = maxcount

    return returndata