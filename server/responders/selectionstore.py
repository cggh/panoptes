from __future__ import absolute_import
from __future__ import division
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from past.utils import old_div
import DQXDbTools
import DQXUtils
from . import asyncresponder
import os
import config
import Utils
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC


def ResponseExecute(returndata, calculationObject):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    keyid = DQXDbTools.ToSafeIdentifier(returndata['keyid'])
    propid = DQXDbTools.ToSafeIdentifier(returndata['propid'])
    dataid = DQXDbTools.ToSafeIdentifier(returndata['dataid'])
    iscustom = int(returndata['iscustom']) > 0
    hassubsampling = int(returndata['hassubsampling']) > 0

    tableList = []

    tableList.append(tableid)

    #calculationObject.Log('==== storing selection '+dataid)

    filename = os.path.join(config.BASEDIR, 'temp', 'store_'+dataid)
    with open(filename, 'r') as fp:
        datastring = fp.read()
    os.remove(filename)


    def PushToTable(tableName):
        #calculationObject.Log('==== STORING SELECTION TO TABLE '+tableName)

        with DQXDbTools.DBCursor(calculationObject.credentialInfo, databaseName) as cur:
            cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, tableName, propid))
            sqlstring = 'UPDATE {0} SET {1}=0 WHERE {1}=1'.format(DBTBESC(tableName), DBCOLESC(propid))
            cur.execute(sqlstring)
            cur.commit()

            if len(datastring) > 0:
                keys = datastring.split('\t')
                def submitkeys(keylist):
                    if len(keylist) > 0:
                        sqlstring = 'UPDATE {0} SET {1}=1 WHERE {2} IN ({3})'.format(DBTBESC(tableName), DBCOLESC(propid), DBCOLESC(keyid), ', '.join(['"'+str(key)+'"' for key in keylist]))
                        cur.execute(sqlstring)
                        cur.commit()
                keysublist = []
                keyNr = 0
                for key in keys:
                    keysublist.append(key)
                    if len(keysublist) >= 500:
                        submitkeys(keysublist)
                        keysublist = []
                        calculationObject.SetInfo('Storing', old_div(keyNr*1.0,len(keys)))
                    keyNr +=1
                submitkeys(keysublist)

    for table in tableList:
        PushToTable(table)




def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Store selection"
    )
    return retval
