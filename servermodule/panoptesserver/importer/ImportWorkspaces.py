import os
import DQXDbTools
import DQXUtils
import config
from DQXTableUtils import VTTable
import SettingsLoader
import ImpUtils
import LoadTable
import uuid
import sys
import shutil
import customresponders.panoptesserver.Utils as Utils
import simplejson

def ImportCustomData(calculationObject, datasetId, workspaceid, tableid, sourceid, folder, importSettings):

    with calculationObject.LogHeader('Importing custom data'):
        print('Importing custom data into {0}, {1}, {2} FROM {3}'.format(datasetId, workspaceid, tableid, folder))

        credInfo = calculationObject.credentialInfo

        if not ImpUtils.IsDatasetPresentInServer(calculationObject.credentialInfo, datasetId):
            raise Exception('Dataset {0} is not found. Please import the dataset first'.format(datasetId))

        db = DQXDbTools.OpenDatabase(credInfo, datasetId)
        calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, 'propertycatalog'))
        calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, 'workspaces'))

        cur = db.cursor()
        cur.execute('SELECT primkey, settings FROM tablecatalog WHERE id="{0}"'.format(tableid))
        row = cur.fetchone()
        if row is None:
            raise Exception('Unable to find table record for table {0} in dataset {1}'.format(tableid, datasetId))
        primkey = row[0]
        tableSettingsStr = row[1]
        db.close()

        ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DELETE FROM customdatacatalog WHERE tableid="{tableid}" and sourceid="{sourceid}"'.format(
            tableid=tableid,
            sourceid=sourceid
        ))


        tableSettings = SettingsLoader.SettingsLoader()
        tableSettings.LoadDict(simplejson.loads(tableSettingsStr, strict=False))

        allowSubSampling = tableSettings['AllowSubSampling']

        isPositionOnGenome = False
        if tableSettings.HasToken('IsPositionOnGenome') and tableSettings['IsPositionOnGenome']:
            isPositionOnGenome = True
            chromField = tableSettings['Chromosome']
            posField = tableSettings['Position']


        settings = SettingsLoader.SettingsLoader(os.path.join(os.path.join(folder, 'settings')))

        ImpUtils.ExecuteSQL(calculationObject, datasetId, "INSERT INTO customdatacatalog VALUES ('{tableid}', '{sourceid}', '{settings}')".format(
            tableid=tableid,
            sourceid=sourceid,
            settings=settings.ToJSON()
        ))


        properties = ImpUtils.LoadPropertyInfo(calculationObject, settings, os.path.join(folder, 'data'))

        # remove primary key, just in case
        properties = [prop for prop in properties if prop['propid'] != primkey ]

        sourcetable=Utils.GetTableWorkspaceProperties(workspaceid, tableid)
        print('Source table: '+sourcetable)

        #Get list of existing properties
        db = DQXDbTools.OpenDatabase(calculationObject.credentialInfo, datasetId)
        cur = db.cursor()
        cur.execute('SELECT propid FROM propertycatalog WHERE (workspaceid="{0}") and (source="custom") and (tableid="{1}")'.format(workspaceid, tableid))
        existingProperties = [row[0] for row in cur.fetchall()]
        print('Existing properties: '+str(existingProperties))
        db.close()

        propidList = []
        for property in properties:
            DQXUtils.CheckValidIdentifier(property['propid'])
            propidList.append(property['propid'])

        db = DQXDbTools.OpenDatabase(calculationObject.credentialInfo, datasetId)
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
            sql = "DELETE FROM propertycatalog WHERE (workspaceid='{0}') and (propid='{1}') and (tableid='{2}')".format(workspaceid, propid, tableid)
            ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)
            sql = "INSERT INTO propertycatalog VALUES ('{0}', 'custom', '{1}', '{2}', '{3}', '{4}', {5}, '{6}')".format(
                workspaceid,
                settings['DataType'],
                propid,
                tableid,
                settings['Name'],
                0,
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
                {'PrimKey': primkey},
                importSettings,
                False
            )


            print('Creating new columns')
            calculationObject.Log('WARNING: better mechanism to determine column types needed here')#TODO: implement
            frst = True
            sql = "ALTER TABLE {0} ".format(sourcetable)
            for property in properties:
                propid = property['propid']
                if not frst:
                    sql += " ,"
                sqldatatype = ImpUtils.GetSQLDataType(property['DataType'])
                sql += "ADD COLUMN {0} {1}".format(propid, sqldatatype)
                frst = False
                calculationObject.LogSQLCommand(sql)
            cur.execute(sql)


            print('Joining information')
            frst = True
            credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, sourcetable))
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

        Utils.UpdateTableInfoView(workspaceid, tableid, allowSubSampling, cur)

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

                    if not isPositionOnGenome:
                        raise Exception('Summary values defined for non-position table')

                    if not importSettings['ConfigOnly']:
                        calculationObject.Log('Extracting data to '+dataFileName)
                        script = ImpUtils.SQLScript(calculationObject)
                        script.AddCommand("SELECT {2} as chrom, {3} as pos, {0} FROM {1} ORDER BY {2},{3}".format(
                            propid,
                            Utils.GetTableWorkspaceView(workspaceid, tableid),
                            chromField,
                            posField
                        ))
                        script.Execute(datasetId, dataFileName)
                        calculationObject.LogFileTop(dataFileName, 10)

                    ImpUtils.CreateSummaryValues_Value(
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
    Utils.CheckSafeIdentifier(workspaceid)
    with calculationObject.LogHeader('Importing workspace {0}.{1}'.format(datasetId, workspaceid)):
        print('Source directory: '+folder)
        settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'settings'))
        settings.RequireTokens(['Name'])
        print(settings.ToJSON())
        workspaceName = settings['Name']

        if not ImpUtils.IsDatasetPresentInServer(calculationObject.credentialInfo, datasetId):
            raise Exception('Dataset {0} is not found. Please import the dataset first'.format(datasetId))

        db = DQXDbTools.OpenDatabase(calculationObject.credentialInfo, datasetId)
        cur = db.cursor()

        def execSQL(cmd):
            calculationObject.LogSQLCommand(cmd)
            cur.execute(cmd)

        cur.execute('SELECT id, primkey, settings FROM tablecatalog')
        tables = [ { 'id': row[0], 'primkey': row[1], 'settingsStr': row[2] } for row in cur.fetchall()]
        tableMap = {table['id']:table for table in tables}

        for table in tables:
            tableSettings = SettingsLoader.SettingsLoader()
            tableSettings.LoadDict(simplejson.loads(table['settingsStr'], strict=False))
            table['settings'] = tableSettings

        if not importSettings['ConfigOnly']:
            for table in tables:
                tableid = table['id']
                print('Re-creating custom data table for '+tableid)
                execSQL("DROP TABLE IF EXISTS {0}".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid)) )
                execSQL("CREATE TABLE {0} (StoredSelection TINYINT DEFAULT 0) AS SELECT {1} FROM {2}".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid), table['primkey'], tableid) )
                execSQL("create unique index {1} on {0}({1})".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid), table['primkey']) )
                execSQL("create index idx_StoredSelection on {0}(StoredSelection)".format(Utils.GetTableWorkspaceProperties(workspaceid, tableid)) )

        print('Removing existing workspace properties')
        execSQL("DELETE FROM propertycatalog WHERE workspaceid='{0}'".format(workspaceid) )

        calculationObject.Log('Creating StoredSelection columns')
        for table in tables:
            tableid = table['id']
            sett = '{"CanUpdate": true, "Index": false, "ReadData": false, "showInTable": false, "Search":"None" }'
            cmd = "INSERT INTO propertycatalog VALUES ('{0}', 'custom', 'Boolean', 'StoredSelection', '{1}', 'Stored selection', 0, '{2}')".format(workspaceid, tableid, sett)
            execSQL(cmd)

        print('Re-creating workspaces record')
        execSQL("DELETE FROM workspaces WHERE id='{0}'".format(workspaceid) )
        execSQL('INSERT INTO workspaces VALUES ("{0}","{1}")'.format(workspaceid, workspaceName) )
        print('Updating views')
        for table in tables:
            Utils.UpdateTableInfoView(workspaceid, table['id'], table['settings']['AllowSubSampling'], cur)

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
                            ImportCustomData(calculationObject, datasetId, workspaceid, tableid, customid, os.path.join(folder, 'customdata', tableid, customid),  importSettings)
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
