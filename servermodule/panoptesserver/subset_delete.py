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

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    subsetid = DQXDbTools.ToSafeIdentifier(returndata['id'])

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    cur = db.cursor()

    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'storedsubsets'))
    cur.execute('DELETE FROM storedsubsets WHERE subsetid={0}'.format(subsetid))
    cur.execute('DELETE FROM {0} WHERE subsetid={1}'.format(DBTBESC(tableid+'_subsets'), subsetid))

    db.close()

    return returndata