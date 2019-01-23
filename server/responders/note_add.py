# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import DQXDbTools
import os
import config
import datetime
import cgi
#from DQXDbTools import DBCOLESC
#from DQXDbTools import DBTBESC


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    itemid = DQXDbTools.ToSafeIdentifier(returndata['itemid'])
    noteid = DQXDbTools.ToSafeIdentifier(returndata['noteid'])

    filename = os.path.join(config.BASEDIR, 'temp', 'store_'+noteid)
    with open(filename, 'r') as fp:
        notestring = fp.read()
    os.remove(filename)

    notestring = cgi.escape(notestring)
    notestring = notestring.replace("'", "\\'")



    with DQXDbTools.DBCursor(returndata, databaseName) as cur:

        if not(cur.credentials.CanDo(DQXDbTools.DbOperationWrite(databaseName, 'notes'))):
            returndata['error'] = 'You do not have the right privilege to add notes'
            return returndata

        sql = "INSERT INTO notes VALUES ('{noteid}', '{tableid}', '{itemid}', '{timestamp}', '{userid}', '{content}')".format(
            noteid=noteid,
            tableid=tableid,
            itemid=itemid,
            timestamp=str(datetime.datetime.now())[0:19],
            userid=cur.credentials.GetUserId(),
            content=notestring
        )
        cur.execute(sql)
        cur.commit()

    return returndata