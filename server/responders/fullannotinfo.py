# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import DQXDbTools
import config


def response(returndata):

    databaseName=None
    if 'database' in returndata:
        databaseName = returndata['database']
    with DQXDbTools.DBCursor(returndata, databaseName) as cur:
        sqlquery="SELECT * FROM {tablename} WHERE fid='{id}'".format(
            tablename=DQXDbTools.ToSafeIdentifier(returndata['table']),
            id=DQXDbTools.ToSafeIdentifier(returndata['id'])
        )

        cur.execute(sqlquery)
        therow=cur.fetchone()
        if therow is None:
            returndata['Error']='Record not found'
        else:
            data={}
            colnr=0
            for column in cur.description:
                data[column[0]]=str(therow[colnr])
                colnr += 1
            returndata['Data']=data
        return returndata
