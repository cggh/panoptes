import DQXDbTools
import uuid
import os
import config
import VTTable
import Utils


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    propid = DQXDbTools.ToSafeIdentifier(returndata['propid'])
    dir = int(DQXDbTools.ToSafeIdentifier(returndata['dir']))

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    #Make sure we have a decent ordr field
    cur.execute("set @rn:=0")
    cur.execute("update propertycatalog set ordr=(@rn:=@rn+1) order by ordr")

    sql = 'SELECT workspaceid, tableid, propid, ordr FROM propertycatalog WHERE ((workspaceid="{0}") or (source="fixed")) and (tableid="{1}") ORDER by ordr'.format(workspaceid, tableid)
    cur.execute(sql)
    workspaces = []
    tables = []
    properties = []
    orders = []
    for row in cur.fetchall():
        workspaces.append(row[0])
        tables.append(row[1])
        properties.append(row[2])
        orders.append(row[3])

    index = None
    for propertyNr in range(len(properties)):
        if propid == properties[propertyNr]:
            index = propertyNr
    if index is None:
        return
    if (index == 0) and (dir < 0):
        return
    if (index == len(properties)-1) and (dir > 0):
        return


    sql1 = 'UPDATE propertycatalog SET ordr={0} WHERE (workspaceid="{1}") and (tableid="{2}") and (propid="{3}")'.format(orders[index+dir], workspaces[index], tables[index], properties[index])
    sql2 = 'UPDATE propertycatalog SET ordr={0} WHERE (workspaceid="{1}") and (tableid="{2}") and (propid="{3}")'.format(orders[index], workspaces[index+dir], tables[index+dir], properties[index+dir])
    print('-------------------------------')
    print(sql1)
    print(sql2)
    print('-------------------------------')
    cur.execute(sql1)
    cur.execute(sql2)

    db.commit()
    db.close()

    return returndata