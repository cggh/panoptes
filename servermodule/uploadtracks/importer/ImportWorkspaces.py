import os
import DQXDbTools
import DQXUtils
import config
import customresponders.uploadtracks.VTTable as VTTable
import SettingsLoader
import ImpUtils
import LoadTable
import uuid
import sys
import shutil
import customresponders.uploadtracks.Utils as Utils


def ImportCustomData(calculationObject, datasetId, workspaceid, tableid, folder, importSettings):

    with calculationObject.LogHeader('Importing custom data'):
        print('Importing custom data into {0}, {1}, {2} FROM {3}'.format(datasetId, workspaceid, tableid, folder))

        db = DQXDbTools.OpenDatabase(datasetId)
        cur = db.cursor()
        cur.execute('SELECT primkey FROM tablecatalog WHERE id="{0}"'.format(tableid))
        primkey = cur.fetchone()[0]
        db.close()

        settings = SettingsLoader.SettingsLoader(os.path.join(os.path.join(folder, 'settings')))

        properties = ImpUtils.LoadPropertyInfo(calculationObject, settings, os.path.join(folder, 'data'))

        sourcetable=Utils.GetTableWorkspaceProperties(workspaceid, tableid)
        print('Source table: '+sourcetable)

        #Get list of existing properties
        db = DQXDbTools.OpenDatabase(datasetId)
        cur = db.cursor()
        cur.execute('SELECT propid FROM propertycatalog WHERE (workspaceid="{0}") and (source="custom") and (tableid="{1}")'.format(workspaceid, tableid))
        existingProperties = [row[0] for row in cur.fetchall()]
        print('Existing properties: '+str(existingProperties))
        db.close()

        propidList = []
        for property in properties:
            DQXUtils.CheckValidIdentifier(property['propid'])
            propidList.append(property['propid'])

        db = DQXDbTools.OpenDatabase(datasetId)
        cur = db.cursor()

        if not importSettings['ConfigOnly']:
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
                for prop in toRemoveExistingProperties:
                    if prop != toRemoveExistingProperties[0]:
                        sql += ", "
                    sql += "DROP COLUMN {0}".format(prop)
                calculationObject.LogSQLCommand(sql)
                cur.execute(sql)


        ranknr = 0
        for property in properties:
            propid = property['propid']
            settings = property['Settings']
            extraSettings = settings.Clone()
            extraSettings.DropTokens(['Name', 'DataType', 'Order','SummaryValues'])
            print('Create property catalog entry for {0} {1} {2}'.format(workspaceid, tableid, propid))
            sql = "INSERT INTO propertycatalog VALUES ('{0}', 'custom', '{1}', '{2}', '{3}', '{4}', {5}, '{6}')".format(
                workspaceid,
                settings['DataType'],
                propid,
                tableid,
                settings['Name'],
                ranknr + 1000,
                extraSettings.ToJSON()
            )
            ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)
            ranknr += 1

        propDict = {}
        for property in properties:
            propDict[property['propid']] = property

        if not importSettings['ConfigOnly']:
            tmptable = Utils.GetTempID()
            columns = [ {
                            'name': prop['propid'],
                            'DataType': prop['DataType'],
                            'Index': prop['Settings']['Index'],
                            'ReadData': prop['Settings']['ReadData']
                        } for prop in properties]
            columns.append({'name':primkey, 'DataType':'Text', 'Index': False, 'ReadData': True})
            # print('----------------------------------------------------------------')
            # print(str(columns))
            # print('----------------------------------------------------------------')
            LoadTable.LoadTable(
                calculationObject,
                os.path.join(folder, 'data'),
                datasetId,
                tmptable,
                columns,
                {'PrimKey': primkey}
            )


            print('Creating new columns')
            frst = True
            sql = "ALTER TABLE {0} ".format(sourcetable)
            for property in properties:
                propid = property['propid']
                if not frst:
                    sql += " ,"
                sqldatatype = 'varchar(50)'
                if ImpUtils.IsValueDataTypeIdenfifier(property['DataType']):
                    sqldatatype = 'float'
                sql += "ADD COLUMN {0} {1}".format(propid, sqldatatype)
                frst = False
                calculationObject.LogSQLCommand(sql)
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
                calculationObject.LogSQLCommand(sql)
            cur.execute(sql)


            print('Cleaning up')
            cur.execute("DROP TABLE {0}".format(tmptable))

        Utils.UpdateTableInfoView(workspaceid, tableid, cur)

        db.commit()
        db.close()

        print('Creating summary values')
        for property in properties:
            propid = property['propid']
            settings = property['Settings']
            if settings.HasToken('SummaryValues'):
                with calculationObject.LogHeader('Creating summary values for custom data {0}'.format(tableid)):
                    summSettings = settings.GetSubSettings('SummaryValues')
                    if settings.HasToken('minval'):
                        summSettings.AddTokenIfMissing('MinVal', settings['minval'])
                    summSettings.AddTokenIfMissing('MaxVal', settings['maxval'])
                    destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', datasetId, propid)
                    if not os.path.exists(destFolder):
                        os.makedirs(destFolder)
                    dataFileName = os.path.join(destFolder, propid)

                    if not importSettings['ConfigOnly']:
                        calculationObject.Log('Extracting data to '+dataFileName)
                        script = ImpUtils.SQLScript(calculationObject)
                        script.AddCommand("SELECT chrom, pos, {0} FROM {1} ORDER BY chrom,pos".format(propid, Utils.GetTableWorkspaceView(workspaceid, tableid)))
                        script.Execute(datasetId, dataFileName)
                        calculationObject.LogFileTop(dataFileName, 10)

                    ImpUtils.CreateSummaryValues(
                        calculationObject,
                        summSettings,
                        datasetId,
                        tableid,
                        'custom',
                        workspaceid,
                        propid,
                        settings['Name'],
                        dataFileName,
                        importSettings
                    )




def ImportWorkspace(calculationObject, datasetId, workspaceid, folder, importSettings):
    with calculationObject.LogHeader('Importing workspace {0}.{1}'.format(datasetId, workspaceid)):
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

        if not importSettings['ConfigOnly']:
            for table in tables:
                tableid = table['id']
                print('Re-creating custom data table for '+tableid)
                cur.execute("DROP TABLE IF EXISTS {0}".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid)) )
                cur.execute("CREATE TABLE {0} (StoredSelection TINYINT) AS SELECT {1} FROM {2}".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid), table['primkey'], tableid) )
                cur.execute("create unique index {1} on {0}({1})".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid), table['primkey']) )

        print('Removing existing workspace properties')
        cur.execute("DELETE FROM propertycatalog WHERE workspaceid='{0}'".format(workspaceid) )

        calculationObject.Log('Creating StoredSelection columns')
        for table in tables:
            tableid = table['id']
            sett = '{"CanUpdate": true, "Index": false, "ReadData": false, "showInTable": false}'
            cmd = "INSERT INTO propertycatalog VALUES ('{0}', 'custom', 'Boolean', 'StoredSelection', '{1}', 'Stored selection', 9999, '{2}')".format(workspaceid, tableid, sett)
            calculationObject.LogSQLCommand(cmd)
            cur.execute(cmd)

        print('Re-creating workspaces record')
        cur.execute("DELETE FROM workspaces WHERE id='{0}'".format(workspaceid) )
        cur.execute("INSERT INTO workspaces VALUES (%s,%s)", (workspaceid, workspaceName) )
        for table in tables:
            Utils.UpdateTableInfoView(workspaceid, table['id'], cur)

        db.commit()
        db.close()

        print('Scanning for custom data')
        if os.path.exists(os.path.join(folder, 'customdata')):
            for tableid in os.listdir(os.path.join(folder, 'customdata')):
                if os.path.isdir(os.path.join(folder, 'customdata', tableid)):
                    if not tableid in tableMap:
                        raise Exception('Invalid table id '+tableid)
                    for customid in os.listdir(os.path.join(folder, 'customdata', tableid)):
                        if os.path.isdir(os.path.join(folder, 'customdata', tableid, customid)):
                            ImportCustomData(calculationObject, datasetId, workspaceid, tableid, os.path.join(folder, 'customdata', tableid, customid),  importSettings)
        else:
            print('Directory not present')


def ImportWorkspaces(calculationObject, datasetFolder, datasetId, settings):

    print('Importing workspace data')
    if not os.path.exists(os.path.join(datasetFolder, 'workspaces')):
        print('No data: skipping')
        return

    workspaces = []
    for dir in os.listdir(os.path.join(datasetFolder, 'workspaces')):
        if os.path.isdir(os.path.join(datasetFolder, 'workspaces', dir)):
            workspaces.append(dir)
    for workspace in workspaces:
        ImportWorkspace(calculationObject, datasetId, workspace, os.path.join(datasetFolder, 'workspaces', workspace), settings)
