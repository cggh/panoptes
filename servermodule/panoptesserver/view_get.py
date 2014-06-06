# This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools


def response(returndata):

    id = DQXDbTools.ToSafeIdentifier(returndata['id'])

    db = DQXDbTools.OpenDatabase(DQXDbTools.ParseCredentialInfo(returndata))
    cur = db.cursor()
    sqlstring = 'SELECT settings FROM storedviews WHERE id="{0}"'.format(id)
    cur.execute(sqlstring)
    therow = cur.fetchone()
    if therow is None:
        returndata['Error'] = 'Unable to find stored view ({0})'.format(id)
    else:
        settings = therow[0]
        returndata['settings']=settings

    return returndata