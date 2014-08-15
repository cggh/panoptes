# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
from DQXDbTools import DBTBESC
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC


# Returns all subsets a data item is member of

def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    itemid = DQXDbTools.ToSafeIdentifier(returndata['itemid'])
    primkey = DQXDbTools.ToSafeIdentifier(returndata['primkey'])
    isNumericalKey = int(DQXDbTools.ToSafeIdentifier(returndata['isnumericalkey'])) > 0

    statement = 'SELECT subsetid FROM {membertable} WHERE {primkey}="{itemid}"'
    if isNumericalKey:
        statement = 'SELECT subsetid FROM {membertable} WHERE {primkey}={itemid}'

    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationRead(databaseName, 'storedsubsets'))
        subsetMemberTable = tableid+'_subsets'
        cur.execute(statement.format(
            membertable=DBTBESC(subsetMemberTable),
            primkey=DBCOLESC(primkey),
            itemid=itemid
        ))
        returndata['subsetmemberlist'] = [row[0] for row in cur.fetchall()]

    return returndata