# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
from DQXDbTools import DBTBESC




# Returns the number of items in an individual subset

def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    subsetid = DQXDbTools.ToSafeIdentifier(returndata['subsetid'])

    maxcount = 50000
    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationRead(databaseName, 'storedsubsets'))
        subsetMemberTable = tableid+'_subsets'
        cur.execute('SELECT count(*) FROM (SELECT * FROM {membertable} WHERE subsetid={subsetid} LIMIT {maxcount}) AS _tmptable_'.format(
            membertable=DBTBESC(subsetMemberTable),
            subsetid=subsetid,
            maxcount=maxcount+1
        ))
        count = int(cur.fetchone()[0])
        returndata['membercount'] = count
        returndata['maxcount'] = maxcount

    return returndata