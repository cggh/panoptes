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

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()
    propertiestable=Utils.GetTableWorkspaceProperties(workspaceid, tableid)


    calculationObject.SetInfo('Deleting data')
    cur.execute("ALTER TABLE {0} DROP COLUMN {1}".format(propertiestable, propid) )
    cur.execute('DELETE FROM propertycatalog WHERE (workspaceid="{0}") AND (source="custom") AND (propid="{1}" and (tableid="{2}"))'.format(workspaceid, propid, tableid) )
    Utils.UpdateTableInfoView(workspaceid, tableid, cur)
    db.commit()
    db.close()




def response(returndata):
    return asyncresponder.RespondAsync(ResponseExecute, returndata, "Delete custom property")

