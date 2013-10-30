import DQXDbTools
import uuid
import os
import config
import VTTable
import Utils


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['id'])

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    #Remove all the tables that have custom tracks for this workspace
    cur.execute('SELECT id FROM customtracks WHERE workspaceid=%s', (workspaceid))
    for row in cur.fetchall() :
        cur.execute("DROP TABLE "+row[0])


    cur.execute('SELECT id FROM tablecatalog')
    tableids = [row[0] for row in cur.fetchall()]

    cur.execute("DELETE FROM workspaces WHERE id=%s", (workspaceid) )
    cur.execute("DELETE FROM propertycatalog WHERE workspaceid=%s", (workspaceid) )
    for tableid in tableids:
        cur.execute("DROP VIEW {0}".format(Utils.GetTableWorkspaceView(workspaceid,tableid)))
        cur.execute("DROP TABLE {0}".format(Utils.GetTableWorkspaceProperties(workspaceid,tableid)))
    db.commit()
    db.close()

    return returndata