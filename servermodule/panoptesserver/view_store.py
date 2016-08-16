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
        sqlstring = 'SELECT content FROM storage WHERE id="{0}"'.format(id)
        cur.execute(sqlstring)
        therow = cur.fetchone()
        settings = therow[0]
        #todo: remove that record

        sql = 'INSERT INTO storedviews VALUES ("{0}", "{1}", "{2}")'.format(databaseName, id, settings)
        cur.execute(sql)
        cur.commit()

        return returndata