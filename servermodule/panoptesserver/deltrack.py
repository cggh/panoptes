# This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
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

    db = DQXDbTools.OpenDatabase(DQXDbTools.ParseCredentialInfo(returndata), databaseName)
    cur = db.cursor()

    cur.execute("DROP TABLE "+trackid)
    cur.execute("DELETE FROM customtracks WHERE id=%s", (trackid) )


    db.commit()
    db.close()


    return returndata