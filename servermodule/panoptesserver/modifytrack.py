# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import uuid
import os
import config
from DQXTableUtils import VTTable


def response(returndata):

    databaseName = returndata['database']
    trackid = returndata['trackid']
    name = returndata['name']
    properties = returndata['properties']

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    cur = db.cursor()

    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'customtracks'))
    cur.execute("UPDATE customtracks SET name=%s WHERE ID=%s", (name,trackid) )
    cur.execute("UPDATE customtracks SET properties=%s WHERE ID=%s", (properties,trackid) )


    db.commit()
    db.close()


    return returndata