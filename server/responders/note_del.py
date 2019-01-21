from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import os
import config
import datetime
#from DQXDbTools import DBCOLESC
#from DQXDbTools import DBTBESC
from . import authorization


def response(returndata):
    credInfo = DQXDbTools.CredentialInformation(returndata)

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    itemid = DQXDbTools.ToSafeIdentifier(returndata['itemid'])
    noteid = DQXDbTools.ToSafeIdentifier(returndata['noteid'])

    ismanager = authorization.IsDataSetManager(credInfo, databaseName)
    #ismanager = False#!!! need to be removed


    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        sql = "SELECT `userid` FROM notes WHERE `id`='{noteid}'".format(noteid=noteid)
        cur.execute(sql)
        rs = cur.fetchone()
        if rs is None:
            return
        if (not(ismanager)) and (rs[0] != cur.credentials.GetUserId()):
            returndata['error'] = 'You do not have the right privilege to remove this note'
            return returndata


        sql = "DELETE FROM notes WHERE `id`='{noteid}'".format(
            noteid=noteid,
        )
        cur.execute(sql)
        cur.commit()

    return returndata