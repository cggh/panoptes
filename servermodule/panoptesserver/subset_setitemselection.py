# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
from DQXDbTools import DBTBESC
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC


# Modifies the membership of a single item in a single subset

def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    itemid = returndata['itemid']
    primkey = DQXDbTools.ToSafeIdentifier(returndata['primkey'])
    isNumericalKey = int(DQXDbTools.ToSafeIdentifier(returndata['isnumericalkey'])) > 0
    subsetid = DQXDbTools.ToSafeIdentifier(returndata['subsetid'])
    ismember = int(returndata['ismember']) > 0

    itemidStr = '"' + itemid.replace('"', '') + '"'
    if isNumericalKey:
        itemidStr = int(itemid)

    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'storedsubsets'))
        subsetMemberTable = tableid+'_subsets'
        cur.execute('SELECT COUNT(*) FROM {membertable} WHERE ({primkey}={itemid}) and (subsetid={subsetid})'.format(
            membertable=DBTBESC(subsetMemberTable),
            primkey=DBCOLESC(primkey),
            itemid=itemidStr,
            subsetid=subsetid
        ))
        iscurrentmember = int(cur.fetchone()[0]) > 0

        if iscurrentmember == ismember: # No need for action
            returndata['diff'] = 0
        else:
            if ismember: # should be added
                sql = 'INSERT INTO {membertable} VALUES ({itemid}, {subsetid})'.format(
                    membertable=DBTBESC(subsetMemberTable),
                    itemid=itemidStr,
                    subsetid=subsetid)
                #print('======'+sql)
                cur.execute(sql)
                cur.commit()
                returndata['diff'] = 1
            else: # should be removed
                sql = 'DELETE FROM {membertable} WHERE ({primkey}={itemid}) and (subsetid={subsetid})'.format(
                    membertable=DBTBESC(subsetMemberTable),
                    primkey=DBCOLESC(primkey),
                    itemid=itemidStr,
                    subsetid=subsetid
                )
                #print('======'+sql)
                cur.execute(sql)
                cur.commit()
                returndata['diff'] = -1

    return returndata