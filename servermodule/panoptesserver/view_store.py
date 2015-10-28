# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])

    #Obtain the settings from storeddata
    with DQXDbTools.DBCursor(returndata) as cur:
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'storedviews'))
        cur.execute('SELECT content FROM storage WHERE id=%s', (id,))
        therow = cur.fetchone()
        settings = therow[0]
        #todo: remove that record

        cur.execute('INSERT INTO storedviews VALUES (%s, %s, %s)', (databaseName, id, settings))
        cur.commit()

        return returndata