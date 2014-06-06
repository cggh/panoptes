# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import config
import DQXDbTools


def response(returndata):

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    db = DQXDbTools.OpenDatabase(credInfo)
    cur = db.cursor()

    list = []
    cur.execute('SELECT id,name FROM datasetindex')
    for row in cur.fetchall():
        if credInfo.CanDo(DQXDbTools.DbOperationRead(row[0])):
            list.append({'id': row[0], 'name': row[1]})

    returndata['datasets'] = list

    return returndata