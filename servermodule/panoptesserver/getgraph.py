# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import config
import DQXDbTools
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
import config


def response(returndata):
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    graphid = DQXDbTools.ToSafeIdentifier(returndata['graphid'])

    with DQXDbTools.DBCursor(returndata, databaseName, read_timeout=config.TIMEOUT) as cur:
        sql = 'select dispname,settings from graphs WHERE (tableid="{tableid}") and (graphid="{graphid}")'.format(
            tableid=tableid,
            graphid=graphid
        )
        cur.execute(sql)
        rs = cur.fetchone()
        if rs is None:
            returndata['Error'] = 'Unable to find graph data record'
            return
        returndata['name'] = rs[0]
        returndata['settings'] = rs[1]

    filename = os.path.join(config.BASEDIR, 'Graphs', databaseName, tableid, graphid)
    if not(os.path.exists(filename)):
        returndata['Error'] = 'Unable to find graph data'
        return
    try:
        with open(filename, 'r') as fp:
            returndata['data'] = fp.read()
    except Exception as e:
        returndata['Error'] = str(e)

    return returndata