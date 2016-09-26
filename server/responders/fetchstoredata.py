# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import uuid

#Find hits for gene patterns (or similar searches)
import config


def response(returndata):
    id = returndata['id']
    with DQXDbTools.DBCursor(returndata) as cur:
        sqlstring = "SELECT content FROM storage WHERE id='{0}'".format(id)
        cur.execute(sqlstring)

        therow = cur.fetchone()
        if therow is None:
            returndata['Error'] = 'Storage record not found'
        else:
            returndata['content'] = therow[0]

        return returndata