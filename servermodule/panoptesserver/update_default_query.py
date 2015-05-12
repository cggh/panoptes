# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import authorization


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])
    defaultQuery = ''
    if 'defaultQuery' in returndata:
        defaultQuery = returndata['defaultQuery']

    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        authorization.VerifyIsDataSetManager(cur.credentials, databaseName)
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'tablecatalog'))
        sql = 'UPDATE tablecatalog SET defaultQuery="{defaultQuery}" WHERE id="{id}"'.format(
            defaultQuery=defaultQuery,
            id=id
        )
        cur.execute(sql)
        cur.commit()

        return returndata