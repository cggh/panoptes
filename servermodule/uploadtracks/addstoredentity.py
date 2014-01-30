import DQXDbTools
import uuid
import os
import config


def response(returndata):

    #!!! todo: check that the table is a valid storage repo

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tablename = DQXDbTools.ToSafeIdentifier(returndata['tablename'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    name = DQXDbTools.ToSafeIdentifier(returndata['name'])
    content = returndata['content']

    uid = 'EN'+str(uuid.uuid1()).replace('-', '_')
    returndata['id'] = uid


    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    cur = db.cursor()


    credInfo.VerifyCanModifyDatabase(databaseName, tablename)
    sql = "INSERT INTO {0} VALUES ('{1}', '{2}', '{3}', '{4}', %s)".format(tablename, uid, name, tableid, workspaceid)
    cur.execute(sql, (content) )

    db.commit()
    db.close()

    return returndata