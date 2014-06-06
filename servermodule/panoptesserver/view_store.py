# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])

    #Obtain the settings from storeddata
    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    db = DQXDbTools.OpenDatabase(credInfo)
    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'storedviews'))
    cur = db.cursor()
    sqlstring = 'SELECT content FROM storage WHERE id="{0}"'.format(id)
    cur.execute(sqlstring)
    therow = cur.fetchone()
    settings = therow[0]
    #todo: remove that record

    sql = 'INSERT INTO storedviews VALUES ("{0}", "{1}", "{2}", "{3}")'.format(databaseName, workspaceid, id, settings)
    cur.execute(sql)
    db.commit()
    db.close()

    return returndata