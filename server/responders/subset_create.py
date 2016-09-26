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
    name = DQXDbTools.ToSafeIdentifier(returndata['name'])

    # uid = 'EN'+str(uuid.uuid1()).replace('-', '_')
    # returndata['id'] = uid


    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'storedsubsets'))
        sql = "INSERT INTO storedsubsets VALUES (0, '{0}', '{1}', 0)".format(
        name, tableid)
        cur.execute(sql)
        cur.commit()

        cur.execute('SELECT MAX(subsetid) FROM storedsubsets')
        returndata['id'] = cur.fetchone()[0]

        return returndata
