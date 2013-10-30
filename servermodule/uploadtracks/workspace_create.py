import DQXDbTools
import uuid
import os
import config
import asyncresponder
import Utils

def ResponseExecute(data, calculationObject):
    databaseName = DQXDbTools.ToSafeIdentifier(data['database'])
    workspaceId = DQXDbTools.ToSafeIdentifier(data['id'])
    workspaceName = DQXDbTools.ToSafeIdentifier(data['name'])

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    cur.execute('SELECT id, primkey FROM tablecatalog')
    tables = [ { 'id': row[0], 'primkey': row[1] } for row in cur.fetchall()]


    calculationObject.SetInfo('Setting up workspace: create tables')
    for table in tables:
        tableid = table['id']
        cur.execute("CREATE TABLE {0} AS SELECT {1} FROM {2}".format(Utils.GetTableWorkspaceProperties(workspaceId,tableid), table['primkey'], tableid) )
        calculationObject.SetInfo('Setting up workspace: create index')
        cur.execute("create unique index {1} on {0}({1})".format(Utils.GetTableWorkspaceProperties(workspaceId,tableid), table['primkey']) )


    cur.execute("INSERT INTO workspaces VALUES (%s,%s)", (workspaceId, workspaceName) )
    for table in tables:
        Utils.UpdateTableInfoView(workspaceId, table['id'], cur)


    db.commit()
    db.close()




def response(returndata):
    returndata['id']='WS'+str(uuid.uuid1()).replace('-', '_')
    return asyncresponder.RespondAsync(ResponseExecute, returndata, "Create new workspace")

