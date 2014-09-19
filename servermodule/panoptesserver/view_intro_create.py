# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import authorization


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    name ='No name'
    if 'name' in returndata:
        name = returndata['name']
    section = ''
    if 'section' in returndata:
        section = returndata['section']
    description = ''
    if 'description' in returndata:
        description = returndata['description']
    viewicon = ''
    if 'viewicon' in returndata:
        viewicon = returndata['viewicon']
    url = returndata['url']
    storeid = DQXDbTools.ToSafeIdentifier(returndata['storeid'])
    viewstate = DQXDbTools.ToSafeIdentifier(returndata['viewstate'])

    #Obtain the settings from storeddata
    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        authorization.VerifyIsDataSetManager(cur.credentials, databaseName)
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'storedviews'))

        sqlstring = 'SELECT max(ordr) FROM introviews WHERE workspaceid="{0}"'.format(workspaceid)
        cur.execute(sqlstring)
        rank = 0
        dbrank = cur.fetchone()[0]
        if dbrank is not None:
            rank = dbrank+1


        sql = 'INSERT INTO introviews VALUES (0, "{workspace}", "{name}", "{section}", "{description}", "{viewicon}", {rank}, "{url}", "{id}", "{state}")'.format(
            workspace=workspaceid,
            name=name,
            section=section,
            description=description,
            viewicon=viewicon,
            rank=rank,
            url=url,
            id=storeid,
            state=viewstate
        )
        cur.execute(sql)
        cur.commit()

        return returndata