# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import authorization


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])
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

    #Obtain the settings from storeddata
    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        authorization.VerifyIsDataSetManager(cur.credentials, databaseName)
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'storedviews'))
        sql = 'UPDATE introviews SET name="{name}", section="{section}", description="{description}", viewicon="{viewicon}" WHERE id="{id}"'.format(
            name=name,
            section=section,
            description=description,
            viewicon=viewicon,
            id=id
        )
        cur.execute(sql)
        cur.commit()

        return returndata