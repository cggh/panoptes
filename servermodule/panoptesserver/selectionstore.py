# This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import DQXUtils
import asyncresponder
import os
import config
import Utils


def ResponseExecute(returndata, calculationObject):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    keyid = DQXDbTools.ToSafeIdentifier(returndata['keyid'])
    propid = DQXDbTools.ToSafeIdentifier(returndata['propid'])
    dataid = DQXDbTools.ToSafeIdentifier(returndata['dataid'])
    iscustom = int(returndata['iscustom']) > 0
    hassubsampling = int(returndata['hassubsampling']) > 0
    cachedworkspace = int(returndata['cachedworkspace']) > 0

    tableList = []

    if not cachedworkspace:
        if not iscustom:
            tableList.append(tableid)
        else:
            tableList.append(Utils.GetTableWorkspaceProperties(workspaceid, tableid))
    else:
        tableList.append(Utils.GetTableWorkspaceView(workspaceid, tableid))
        if hassubsampling:
            tableList.append(Utils.GetTableWorkspaceViewSubSampling(workspaceid, tableid))

    #calculationObject.Log('==== storing selection '+dataid)

    filename = os.path.join(config.BASEDIR, 'temp', 'store_'+dataid)
    with open(filename, 'r') as fp:
        datastring = fp.read()
    os.remove(filename)


    def PushToTable(tableName):
        #calculationObject.Log('==== STORING SELECTION TO TABLE '+tableName)

        credInfo = calculationObject.credentialInfo
        db = DQXDbTools.OpenDatabase(credInfo, databaseName)
        cur = db.cursor()
        credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, tableName, propid))
        sqlstring = 'UPDATE {0} SET {1}=0 WHERE {1}=1'.format(tableName, propid)
        cur.execute(sqlstring)
        db.commit()

        if len(datastring) > 0:
            keys = datastring.split('\t')
            def submitkeys(keylist):
                if len(keylist) > 0:
                    sqlstring = 'UPDATE {0} SET {1}=1 WHERE {2} IN ({3})'.format(tableName, propid, keyid, ', '.join(['"'+str(key)+'"' for key in keylist]))
                    print(sqlstring)
                    cur.execute(sqlstring)
                    db.commit()
            keysublist = []
            keyNr = 0
            for key in keys:
                keysublist.append(key)
                if len(keysublist) >= 500:
                    submitkeys(keysublist)
                    keysublist = []
                    calculationObject.SetInfo('Storing', keyNr*1.0/len(keys))
                keyNr +=1
            submitkeys(keysublist)

        db.close()


    for table in tableList:
        PushToTable(table)




def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Store selection"
    )
    return retval
