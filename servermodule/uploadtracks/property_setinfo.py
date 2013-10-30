import DQXDbTools
import uuid
import os
import config
import asyncresponder
import time
import Utils

def ResponseExecute(data, calculationObject):

    databaseName = DQXDbTools.ToSafeIdentifier(data['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(data['workspaceid'])
    propid = DQXDbTools.ToSafeIdentifier(data['propid'])
    tableid = DQXDbTools.ToSafeIdentifier(data['tableid'])
    name = DQXDbTools.ToSafeIdentifier(data['name'])
    settings = data['settings']#.replace("'","").replace("\\","")

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()
    sql = 'UPDATE propertycatalog SET name="{0}" WHERE (workspaceid="{1}") AND (propid="{2}" and (tableid="{3}"))'.format(name, workspaceid, propid, tableid)
    cur.execute(sql)
    sql = 'UPDATE propertycatalog SET settings=\'{0}\' WHERE (workspaceid="{1}") AND (propid="{2}" and (tableid="{3}"))'.format(settings, workspaceid, propid, tableid)
    #print('========== '+sql)
    cur.execute(sql)
    db.commit()
    db.close()




def response(returndata):
    return asyncresponder.RespondAsync(ResponseExecute, returndata, "Modify custom property settings")

