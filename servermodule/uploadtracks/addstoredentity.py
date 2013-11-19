import DQXDbTools
import uuid
import os
import config


def response(returndata):

    #!!! todo: check that the table is a valid storage repo

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tablename = DQXDbTools.ToSafeIdentifier(returndata['tablename'])
    name = DQXDbTools.ToSafeIdentifier(returndata['name'])
    content = returndata['content']

    uid = 'EN'+str(uuid.uuid1()).replace('-', '_')
    returndata['id'] = uid


    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()


    sql = "INSERT INTO {0} VALUES ('{1}', '{2}', '{3}', %s)".format(tablename, uid, name, workspaceid)
    #print(sql)
    cur.execute(sql, (content) )

    db.commit()
    db.close()

    return returndata