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