# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import DQXDbTools
import DQXUtils
import config
import SettingsLoader
import ImpUtils
import LoadTable
import customresponders.panoptesserver.Utils as Utils
import simplejson
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC

def ImportCustomData(calculationObject, datasetId, workspaceid, tableid, sourceid, folder, importSettings):

    with calculationObject.LogHeader('Importing custom data'):
        print('Importing custom data into {0}, {1}, {2} FROM {3}'.format(datasetId, workspaceid, tableid, folder))

        credInfo = calculationObject.credentialInfo

        if not ImpUtils.IsDatasetPresentInServer(calculationObject.credentialInfo, datasetId):
            raise Exception('Dataset {0} is not found. Please import the dataset first'.format(datasetId))

        calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, 'propertycatalog'))
        calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, 'workspaces'))
        with DQXDbTools.DBCursor(credInfo, datasetId) as cur:
            cur.execute('SELECT primkey, settings FROM tablecatalog WHERE id="{0}"'.format(tableid))
            row = cur.fetchone()
            if row is None:
                raise Exception('Unable to find table record for table {0} in dataset {1}'.format(tableid, datasetId))
            primkey = row[0]
            tableSettingsStr = row[1]

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
        with DQXDbTools.DBCursor(calculationObject.credentialInfo, datasetId) as cur:
            cur.execute('SELECT propid FROM propertycatalog WHERE (workspaceid="{0}") and (source="custom") and (tableid="{1}")'.format(workspaceid, tableid))
            existingProperties = [row[0] for row in cur.fetchall()]
            print('Existing properties: '+str(existingProperties))

        propidList = []
        for property in properties:
            DQXUtils.CheckValidColumnIdentifier(property['propid'])
            propidList.append(property['propid'])

        with DQXDbTools.DBCursor(calculationObject.credentialInfo, datasetId) as cur:
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
                    sql = "ALTER TABLE {0} ".format(DBTBESC(sourcetable))
                    for prop in toRemoveExistingProperties:
                        if prop != toRemoveExistingProperties[0]:
                            sql += ", "
                        sql += "DROP COLUMN {0}".format(DBCOLESC(prop))
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
                frst = True
                sql = "ALTER TABLE {0} ".format(DBTBESC(sourcetable))
                for property in properties:
                    propid = property['propid']
                    if not frst:
                        sql += " ,"
                    sqldatatype = ImpUtils.GetSQLDataType(property['DataType'])
                    sql += "ADD COLUMN {0} {1}".format(DBCOLESC(propid), sqldatatype)
                    frst = False
                    calculationObject.LogSQLCommand(sql)
                cur.execute(sql)


                print('Joining information')
                frst = True
                credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId, sourcetable))
                sql = "update {0} left join {1} on {0}.{2}={1}.{2} set ".format(DBTBESC(sourcetable), tmptable, DBCOLESC(primkey))
                for property in properties:
                    propid = property['propid']
                    if not frst:
                        sql += ", "
                    sql += "{0}.{2}={1}.{2}".format(DBTBESC(sourcetable), tmptable, DBCOLESC(propid))
                    frst = False
                    calculationObject.LogSQLCommand(sql)
                cur.execute(sql)


                print('Cleaning up')
                cur.execute("DROP TABLE {0}".format(tmptable))

            if not importSettings['ConfigOnly']:
                print('Updating view')
                Utils.UpdateTableInfoView(workspaceid, tableid, allowSubSampling, cur)

            cur.commit()

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
                            DBCOLESC(propid),
                            DBTBESC(Utils.GetTableWorkspaceView(workspaceid, tableid)),
                            DBCOLESC(chromField),
                            DBCOLESC(posField)
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
    with calculationObject.LogHeader('Importing workspace {0}.{1}'.format(datasetId, workspaceid)):
        DQXUtils.CheckValidTableIdentifier(workspaceid)
        print('Source directory: '+folder)
        settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'settings'))
        settings.RequireTokens(['Name'])
        print(settings.ToJSON())
        workspaceName = settings['Name']

        if not ImpUtils.IsDatasetPresentInServer(calculationObject.credentialInfo, datasetId):
            raise Exception('Dataset {0} is not found. Please import the dataset first'.format(datasetId))

        with DQXDbTools.DBCursor(calculationObject.credentialInfo, datasetId) as cur:

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
                    execSQL("CREATE TABLE {0} (StoredSelection TINYINT DEFAULT 0) AS SELECT {1} FROM {2}".format(
                        DBTBESC(Utils.GetTableWorkspaceProperties(workspaceid, tableid)),
                        DBCOLESC(table['primkey']),
                        DBTBESC(tableid)
                    ))
                    execSQL("create unique index {1} on {0}({1})".format(
                        DBTBESC(Utils.GetTableWorkspaceProperties(workspaceid, tableid)),
                        DBCOLESC(table['primkey']))
                    )
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
            if not importSettings['ConfigOnly']:
                print('Updating views')
                for table in tables:
                    Utils.UpdateTableInfoView(workspaceid, table['id'], table['settings']['AllowSubSampling'], cur)

            cur.commit()

        print('Scanning for custom data')
        if os.path.exists(os.path.join(folder, 'customdata')):
            for tableid in os.listdir(os.path.join(folder, 'customdata')):
                if os.path.isdir(os.path.join(folder, 'customdata', tableid)):
                    if not tableid in tableMap:
                        raise Exception('Invalid table id '+tableid)

                    #Read optional settings file
                    customdatalist = None
                    settingsfilename = os.path.join(folder, 'customdata', tableid, 'settings')
                    if os.path.isfile(settingsfilename):
                        with open(settingsfilename) as settingsfile:
                            cSettings = SettingsLoader.SettingsLoader(settingsfilename)
                            if cSettings.HasToken('CustomData'):
                                if not type(cSettings['CustomData']) is list:
                                    raise Exception('CustomData token should be a list')
                                customdatalist = cSettings['CustomData']
                                print('Custom data list taken from settings')
                    if customdatalist is None:# Alternatively, just use list of folders
                        customdatalist = []
                        for customid in os.listdir(os.path.join(folder, 'customdata', tableid)):
                            if os.path.isdir(os.path.join(folder, 'customdata', tableid, customid)):
                                customdatalist.append(customid)
                        print('Custom data list taken from folders')
                    print('Custom data list: '+str(customdatalist))
                    for customid in customdatalist:
                        ImportCustomData(calculationObject, datasetId, workspaceid, tableid, customid, os.path.join(folder, 'customdata', tableid, customid),  importSettings)

        else:
            print('Directory not present')

        for table in tables:
            CheckMaterialiseWorkspaceView(calculationObject, datasetId, workspaceid, table['id'], importSettings)


def CheckMaterialiseWorkspaceView(calculationObject, datasetId, workspaceid, tableid, importSettings):

    if importSettings['ConfigOnly']:
        return

    print('Checking for materialising of {0},{1},{2}'.format(datasetId, workspaceid, tableid))
    with DQXDbTools.DBCursor(calculationObject.credentialInfo, datasetId) as cur:
        cur.execute('SELECT settings FROM tablecatalog WHERE id="{0}"'.format(tableid))
        tableSettingsStr = cur.fetchone()[0]
        tableSettings = SettingsLoader.SettingsLoader()
        tableSettings.LoadDict(simplejson.loads(tableSettingsStr, strict=False))
        #print('Table settings= '+tableSettings)
        if (tableSettings.HasToken('CacheWorkspaceData')) and (tableSettings['CacheWorkspaceData']):
            print('Executing materialising')
            cur.execute('show indexes from {0}'.format(tableid))
            indexedColumns1 = [indexRow[4] for indexRow in cur.fetchall()]
            cur.execute('show indexes from {0}INFO_{1}'.format(tableid, workspaceid))
            indexedColumns2 = [indexRow[4] for indexRow in cur.fetchall()]
            indexedColumns = set(indexedColumns1+indexedColumns2)


            print('Indexed columns: ' + str(indexedColumns))
            tmptable = '_tmptable_'
            wstable = '{0}CMB_{1}'.format(tableid, workspaceid)
            ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DROP TABLE IF EXISTS {0}'.format(tmptable))
            sql = 'CREATE TABLE {0} as SELECT * FROM {1}'.format(tmptable, DBTBESC(wstable))
            ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)

            for indexedColumn in indexedColumns:
                sql = 'CREATE INDEX {0} ON {1}({0})'.format(DBCOLESC(indexedColumn), DBTBESC(tmptable))
                ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)

            if tableSettings['IsPositionOnGenome']:
                calculationObject.Log('Indexing chromosome,position on materialised view')
                sql = 'create index mt1_chrompos ON {0}({1},{2})'.format(
                    DBTBESC(tmptable),
                    DBCOLESC(tableSettings['Chromosome']),
                    DBCOLESC(tableSettings['Position'])
                )
                ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)

            ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DROP VIEW IF EXISTS {0}'.format(DBTBESC(wstable)))
            ImpUtils.ExecuteSQL(calculationObject, datasetId, 'RENAME TABLE {0} TO {1}'.format(tmptable, DBTBESC(wstable)))

            if (tableSettings.HasToken('AllowSubSampling')) and (tableSettings['AllowSubSampling']):
                print('Processing subsampling table')
                indexedColumnsSubSampling = set(indexedColumns1 + indexedColumns2 + ['RandPrimKey'])
                tmptable = '_tmptable_'
                wstable = '{0}CMBSORTRAND_{1}'.format(tableid, workspaceid)
                ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DROP TABLE IF EXISTS {0}'.format(tmptable))
                sql = 'CREATE TABLE {0} as SELECT * FROM {1}'.format(tmptable, DBTBESC(wstable))
                ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)

                for indexedColumn in indexedColumnsSubSampling:
                    sql = 'CREATE INDEX {0} ON {1}({0})'.format(DBCOLESC(indexedColumn), DBTBESC(tmptable))
                    ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)

                ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DROP VIEW IF EXISTS {0}'.format(DBTBESC(wstable)))
                ImpUtils.ExecuteSQL(calculationObject, datasetId, 'RENAME TABLE {0} TO {1}'.format(tmptable, DBTBESC(wstable)))



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