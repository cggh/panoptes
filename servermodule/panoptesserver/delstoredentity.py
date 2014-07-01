# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
from DQXDbTools import DBTBESC


def response(returndata):

    #!!! todo: check that the table is a valid storage repo

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tablename = DQXDbTools.ToSafeIdentifier(returndata['tablename'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])


    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        sql = "DELETE FROM {0} WHERE id='{1}'".format(DBTBESC(tablename), id)
        cur.execute(sql)
        cur.commit()

        return returndata
