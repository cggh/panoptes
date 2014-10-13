# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import os
import config
import datetime
#from DQXDbTools import DBCOLESC
#from DQXDbTools import DBTBESC


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    itemid = DQXDbTools.ToSafeIdentifier(returndata['itemid'])


    notes_id = []
    notes_timestamp = []
    notes_userid = []
    notes_content = []
    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        sql = "SELECT `id`, `timestamp`, `userid`, `content` FROM notes WHERE (tableid='{tableid}') and (itemid='{itemid}') ORDER BY `timestamp`".format(
            tableid=tableid,
            itemid=itemid
        )
        cur.execute(sql)
        for row in cur.fetchall():
            notes_id.append(row[0])
            notes_timestamp.append(row[1])
            notes_userid.append(row[2])
            notes_content.append(row[3])

    returndata['notes_id'] = notes_id
    returndata['notes_timestamp'] = notes_timestamp
    returndata['notes_userid'] = notes_userid
    returndata['notes_content'] = notes_content

    return returndata