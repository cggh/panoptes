# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import uuid
import os
import config
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC


def response(returndata):

    #!!! todo: check that the table is a valid storage repo

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tablename = DQXDbTools.ToSafeIdentifier(returndata['tablename'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    name = DQXDbTools.ToSafeIdentifier(returndata['name'])
    content = returndata['content']

    uid = 'EN'+str(uuid.uuid1()).replace('-', '_')
    returndata['id'] = uid


    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, tablename))
        sql = "INSERT INTO {0} VALUES ('{1}', '{2}', '{3}', '{4}', %s)".format(
        DBTBESC(tablename), uid, name, tableid, workspaceid)
        cur.execute(sql, [content])
        cur.commit()
        return returndata
