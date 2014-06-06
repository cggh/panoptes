# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import authorization


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])
    method = returndata['tpe']

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'storedviews'))
    cur = db.cursor()

    sqlstring = 'SELECT max(ordr) FROM introviews WHERE workspaceid="{0}"'.format(workspaceid)
    cur.execute(sqlstring)
    maxrank = 0
    dbrank = cur.fetchone()[0]
    if dbrank is not None:
        maxrank = dbrank


    sql = 'UPDATE introviews SET ordr={newrank} WHERE id="{id}"'.format(
        id=id,
        newrank=maxrank+1
    )
    cur.execute(sql)
    db.commit()
    db.close()

    return returndata