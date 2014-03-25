import uuid
import re

reservedTableNames = ['2D_propertycatalog', '2D_tablecatalog', 'annotation', 'chromosomes', 'externallinks', 'propertycatalog', 'relations', 'settings', 'storedqueries', 'summaryvalues', 'tablebasedsummaryvalues', 'tablecatalog', 'workspaces']

def CheckSafeIdentifier(id):
    if not re.match("[_A-Za-z][_a-zA-Z0-9]*$", id):
        raise Exception('Invalid identifier (invalid syntax): ' + id)
    if id in reservedTableNames:
        raise Exception('Invalid identifier (reserved name): ' + id)

def GetTempID():
    return 'TMP'+str(uuid.uuid1()).replace('-', '_')

def GetTableWorkspaceProperties(workspaceid, tableid):
    return "{0}INFO_{1}".format(tableid, workspaceid)

def GetTableWorkspaceView(workspaceid, tableid):
    return "{0}CMB_{1}".format(tableid, workspaceid)


def GetTablePrimKey(tableid, cur):
    cur.execute('SELECT primkey FROM tablecatalog WHERE (id="{0}")'.format(tableid))
    return cur.fetchone()[0]

def UpdateTableInfoView(workspaceid, tableid, cur):

    propertiesTable = GetTableWorkspaceProperties(workspaceid, tableid)
    viewName = GetTableWorkspaceView(workspaceid, tableid)

    # Creating list of all custom properties
    cur.execute('SELECT propid FROM propertycatalog WHERE (workspaceid="{0}") and (source="custom") and (tableid="{1}")'.format(workspaceid, tableid))
    properties = [ row[0] for row in cur.fetchall() ]

    primkey = GetTablePrimKey(tableid, cur)

    sql = "create or replace view {0} as select {1}.*".format(viewName,tableid)
    for propid in properties:
        sql += ", {0}.{1}".format(propertiesTable, propid)
    sql += " from {0} left join {1} on {0}.{2}={1}.{2}".format(tableid, propertiesTable, primkey)
    print('SQL:' + sql)
    cur.execute(sql)