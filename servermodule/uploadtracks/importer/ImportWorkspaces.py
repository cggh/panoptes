import os
import DQXDbTools
import DQXUtils
import config
import customresponders.uploadtracks.VTTable as VTTable
import SettingsLoader
import ImpUtils
import uuid
import sys
import shutil
import customresponders.uploadtracks.Utils as Utils


def ImportCustomData(calculationObject, datasetId, workspaceid, tableid, folder):

    print('#### IMPORTING CUSTOM DATA into {0}, {1}, {2} FROM {3}'.format(datasetId, workspaceid, tableid, folder))

    db = DQXDbTools.OpenDatabase(datasetId)
    cur = db.cursor()
    cur.execute('SELECT primkey FROM tablecatalog WHERE id="{0}"'.format(tableid))
    primkey = cur.fetchone()[0]
    db.close()


    sourcetable=Utils.GetTableWorkspaceProperties(workspaceid, tableid)
    print('Source table: '+sourcetable)

    #Get list of existing properties
    db = DQXDbTools.OpenDatabase(datasetId)
    cur = db.cursor()
    cur.execute('SELECT propid FROM propertycatalog WHERE (workspaceid="{0}") and (source="custom") and (tableid="{1}")'.format(workspaceid, tableid))
    existingProperties = [row[0] for row in cur.fetchall()]
    print('Existing properties: '+str(existingProperties))
    db.close()


    # Load properties
    properties = []
    for fle in os.listdir(os.path.join(folder, 'properties')):
        if os.path.isfile(os.path.join(folder, 'properties', fle)):
            if (fle.find('~') < 0) and (fle[0] != '.'):
                properties.append({'propid':fle})
    print('Properties: '+str(properties))

    propidList = []
    for property in properties:
        DQXUtils.CheckValidIdentifier(property['propid'])
        propidList.append(property['propid'])

    db = DQXDbTools.OpenDatabase(datasetId)
    cur = db.cursor()

    # Dropping columns that will be replaced
    toRemoveExistingProperties = []
    for existProperty in existingProperties:
        if existProperty in propidList:
            toRemoveExistingProperties.append(existProperty)
    print('Removing outdated information:')
    if len(toRemoveExistingProperties) > 0:
        for prop in toRemoveExistingProperties:
            print('Removing outdated information: {0} {1} {2}'.format(workspaceid, prop, tableid))
            sql = 'DELETE FROM propertycatalog WHERE (workspaceid="{0}") and (propid="{1}") and (tableid="{2}")'.format(workspaceid, prop, tableid)
            print(sql)
            cur.execute(sql)
        sql = "ALTER TABLE {0} ".format(sourcetable)
        for prop in propidList:
            if prop != propidList[0]:
                sql += ", "
            sql += "DROP COLUMN {0}".format(prop)
        print('=========== STATEMENT '+sql)
        cur.execute(sql)


    for property in properties:
        propid = property['propid']
        DQXUtils.CheckValidIdentifier(propid)
        settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'properties', propid))
        settings.DefineKnownTokens(['isCategorical', 'minval', 'maxval', 'decimDigits', 'showInBrowser', 'showInTable', 'categoryColors'])
        settings.ConvertToken_Boolean('isCategorical')
        settings.RequireTokens(['Name', 'DataType'])
        settings.AddTokenIfMissing('Order', 99999)
        property['DataType'] = settings['DataType']
        property['Order'] = settings['Order']
        extraSettings = settings.Clone()
        extraSettings.DropTokens(['Name', 'DataType', 'Order','SummaryValues'])
        print('Create property catalog entry for {0} {1} {2}'.format(workspaceid, tableid, propid))
        sql = "INSERT INTO propertycatalog VALUES ('{0}', 'custom', '{1}', '{2}', '{3}', '{4}', {5}, '{6}')".format(
            workspaceid,
            settings['DataType'],
            propid,
            tableid,
            settings['Name'],
            settings['Order'],
            extraSettings.ToJSON()
        )
        print('SQL command: '+sql)
        ImpUtils.ExecuteSQL(datasetId, sql)
        property['settings'] = settings

    properties = sorted(properties, key=lambda k: k['Order'])
    propDict = {}
    for property in properties:
        propDict[property['propid']] = property

    # Load datatable
    print('Loading data table')
    tb = VTTable.VTTable()
    tb.allColumnsText = True
    try:
        tb.LoadFile(os.path.join(folder, 'data'))
    except Exception as e:
        raise Exception('Error while reading file: '+str(e))
    print('---- ORIG TABLE ----')
    tb.PrintRows(0, 9)

    for property in properties:
        if not tb.IsColumnPresent(property['propid']):
            raise Exception('Missing column "{0}" in datatable "{1}"'.format(property['propid'], tableid))

    if not tb.IsColumnPresent(primkey):
        raise Exception('Missing primary key '+primkey)

    for col in tb.GetColList():
        if (col not in propDict) and (col != primkey):
            tb.DropCol(col)
    tb.ArrangeColumns(propidList)
    for property in properties:
        propid = property['propid']
        if property['DataType'] == 'Value':
            tb.ConvertColToValue(propid)
        if property['DataType'] == 'Boolean':
            tb.MapCol(propid, ImpUtils.convertToBooleanInt)
            tb.ConvertColToValue(propid)
    print('---- PROCESSED TABLE ----')
    tb.PrintRows(0, 9)

    tmptable = Utils.GetTempID()
    tmpfile_create = ImpUtils.GetTempFileName()
    tmpfile_dump = ImpUtils.GetTempFileName()
    tb.SaveSQLCreation(tmpfile_create, tmptable)
    tb.SaveSQLDump(tmpfile_dump, tmptable)
    ImpUtils.ExecuteSQLScript(tmpfile_create, datasetId)
    ImpUtils.ExecuteSQLScript(tmpfile_dump, datasetId)
    os.remove(tmpfile_create)
    os.remove(tmpfile_dump)



    print('Indexing new information')
    cur.execute('CREATE UNIQUE INDEX {1} ON {0}({1})'.format(tmptable, primkey))





    print('Creating new columns')
    frst = True
    sql = "ALTER TABLE {0} ".format(sourcetable)
    for property in properties:
        propid = property['propid']
        if not frst:
            sql += " ,"
        sqldatatype = 'varchar(50)'
        if property['DataType'] == 'Value':
            sqldatatype = 'float'
        sql += "ADD COLUMN {0} {1}".format(propid, sqldatatype)
        frst = False
    print('=========== STATEMENT '+sql)
    cur.execute(sql)


    print('Joining information')
    frst = True
    sql = "update {0} left join {1} on {0}.{2}={1}.{2} set ".format(sourcetable, tmptable, primkey)
    for property in properties:
        propid = property['propid']
        if not frst:
            sql += " ,"
        sql += "{0}.{2}={1}.{2}".format(sourcetable,tmptable,propid)
        frst = False
    print('=========== STATEMENT '+sql)
    cur.execute(sql)


    print('Cleaning up')
    cur.execute("DROP TABLE {0}".format(tmptable))

    Utils.UpdateTableInfoView(workspaceid, tableid, cur)

    db.commit()
    db.close()





def ImportWorkspace(calculationObject, datasetId, workspaceid, folder):
    print('##### IMPORTING WORKSPACE {0}.{1}'.format(datasetId, workspaceid))
    print('Source directory: '+folder)
    settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'settings'))
    settings.RequireTokens(['Name'])
    print(settings.ToJSON())
    workspaceName = settings['Name']

    db = DQXDbTools.OpenDatabase(datasetId)
    cur = db.cursor()

    cur.execute('SELECT id, primkey FROM tablecatalog')
    tables = [ { 'id': row[0], 'primkey': row[1] } for row in cur.fetchall()]
    tableMap = {table['id']:table for table in tables}

    for table in tables:
        tableid = table['id']
        print('Re-creating custom data table for '+tableid)
        cur.execute("DROP TABLE IF EXISTS {0}".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid)) )
        cur.execute("CREATE TABLE {0} AS SELECT {1} FROM {2}".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid), table['primkey'], tableid) )
        cur.execute("create unique index {1} on {0}({1})".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid), table['primkey']) )

    print('Removing existing workspace properties')
    cur.execute("DELETE FROM propertycatalog WHERE workspaceid='{0}'".format(workspaceid) )

    print('Re-creating workspaces record')
    cur.execute("DELETE FROM workspaces WHERE id='{0}'".format(workspaceid) )
    cur.execute("INSERT INTO workspaces VALUES (%s,%s)", (workspaceid, workspaceName) )
    for table in tables:
        Utils.UpdateTableInfoView(workspaceid, table['id'], cur)

    db.commit()
    db.close()

    print('############ SCANNING FOR CUSTOM DATA')
    for tableid in os.listdir(os.path.join(folder, 'customdata')):
        if os.path.isdir(os.path.join(folder, 'customdata', tableid)):
            if not tableid in tableMap:
                raise Exception('Invalid table id '+tableid)
            for customid in os.listdir(os.path.join(folder, 'customdata', tableid)):
                if os.path.isdir(os.path.join(folder, 'customdata', tableid, customid)):
                    ImportCustomData(calculationObject, datasetId, workspaceid, tableid, os.path.join(folder, 'customdata', tableid, customid))


def ImportWorkspaces(calculationObject, datasetFolder, datasetId):

    print('==== IMPORTING WORKSPACE DATA ======')
    if not os.path.exists(os.path.join(datasetFolder, 'workspaces')):
        print('No data: skipping')
        return

    workspaces = []
    for dir in os.listdir(os.path.join(datasetFolder, 'workspaces')):
        if os.path.isdir(os.path.join(datasetFolder, 'workspaces', dir)):
            workspaces.append(dir)
    for workspace in workspaces:
        ImportWorkspace(calculationObject, datasetId, workspace, os.path.join(datasetFolder, 'workspaces', workspace))
    print('--- Finished importing workspace data')
