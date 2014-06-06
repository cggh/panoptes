# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import authorization


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    cur = db.cursor()

    sql = 'DELETE FROM introviews WHERE id={id}'.format(
        id=id
    )
    cur.execute(sql)
    db.commit()
    db.close()

    return returndata