from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import config
import os
import uuid
import DQXDbTools
from . import authorization
from . import schemaversion
from pymonetdb.exceptions import DatabaseError


def response(returndata):


    credInfo = DQXDbTools.CredentialInformation(returndata)
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])

    returndata['manager'] = authorization.IsDataSetManager(credInfo, databaseName)
    returndata['userid'] = credInfo.GetUserId()

    needfullreload = False
    needconfigreload = False
    try:
        with DQXDbTools.DBCursor(returndata, databaseName) as cur:
            cur.execute('SELECT "content" FROM "settings" WHERE "id"=%s', ("DBSchemaVersion",))

            rs = cur.fetchone()
            if rs is None:
                needfullreload = True
            else:
                majorversion = int(rs[0].split('.')[0])
                minorversion = int(rs[0].split('.')[1])
                if majorversion < schemaversion.major:
                    needfullreload = True
                else:
                    if (majorversion == schemaversion.major) and (minorversion < schemaversion.minor):
                        needconfigreload = True
    except DatabaseError:
        needfullreload = True

    returndata['needfullreload'] = needfullreload
    returndata['needconfigreload'] = needconfigreload

    return returndata
