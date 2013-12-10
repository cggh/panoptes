import DQXDbTools
import uuid
import os
import config


def response(returndata):

    #!!! todo: check that the table is a valid storage repo

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tablename = DQXDbTools.ToSafeIdentifier(returndata['tablename'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])


    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()


    sql = "DELETE FROM {0} WHERE id='{1}'".format(tablename, id)
    cur.execute(sql)

    db.commit()
    db.close()

    return returndata