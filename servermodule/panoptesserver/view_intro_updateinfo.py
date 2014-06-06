# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
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

    #Obtain the settings from storeddata
    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'storedviews'))
    cur = db.cursor()


    sql = 'UPDATE introviews SET name="{name}", section="{section}", description="{description}" WHERE id="{id}"'.format(
        name=name,
        section=section,
        description=description,
        id=id
    )
    cur.execute(sql)
    db.commit()
    db.close()

    return returndata