# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import uuid
import os
import config
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    subsetid = DQXDbTools.ToSafeIdentifier(returndata['id'])

    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'storedsubsets'))
        sql = 'DELETE FROM storedsubsets WHERE subsetid={0}'.format(subsetid)
        cur.execute(sql)
        sql = 'DELETE FROM {0} WHERE subsetid={1}'.format(DBTBESC(tableid+'_subsets'), subsetid)
        cur.execute(sql)
        cur.commit()

    return returndata