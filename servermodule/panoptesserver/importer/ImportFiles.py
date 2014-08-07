# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import sys
import shutil
try:
    import DQXDbTools
except:
    print('Failed to import DQXDbTools. Please add the DQXServer base directory to the Python path')
    sys.exit()
import DQXUtils
import config
import SettingsLoader
import ImpUtils
import customresponders.panoptesserver.Utils as Utils

from ImportDataTable import ImportDataTable
from Import2DDataTable import Import2DDataTable
import ImportRefGenome
from ImportWorkspaces import ImportWorkspaces
import time
import math
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC
from DQXDbTools import DBDBESC


def GetCurrentSchemaVersion(calculationObject, datasetId):
    with DQXDbTools.DBCursor(calculationObject.credentialInfo, datasetId) as cur:
        cur.execute('SELECT `content` FROM `settings` WHERE `id`="DBSchemaVersion"')
        rs = cur.fetchone()
        if rs is None:
            return (0, 0)
        else:
            majorversion = int(rs[0].split('.')[0])
            minorversion = int(rs[0].split('.')[1])
            return (majorversion, minorversion)

def ImportDocs(calculationObject, datasetFolder, datasetId):
    sourceDocFolder = os.path.join(datasetFolder, 'doc')
    if not(os.path.exists(sourceDocFolder)):
        return
    with calculationObject.LogHeader('Creating documentation'):
        destDocFolder = os.path.join(config.BASEDIR, 'Docs', datasetId)
        try:
            shutil.rmtree(destDocFolder)
        except OSError:
            #Don't fail if exists
            pass
        shutil.copytree(sourceDocFolder, destDocFolder)


def ImportDataSet(calculationObject, baseFolder, datasetId, importSettings):
    with calculationObject.LogHeader('Importing dataset {0}'.format(datasetId)):
        calculationObject.Log('Import settings: '+str(importSettings))
        DQXUtils.CheckValidDatabaseIdentifier(datasetId)
        datasetFolder = os.path.join(baseFolder, datasetId)
        indexDb = config.DB

        calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(indexDb, 'datasetindex'))
        calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(datasetId))

        # Remove current reference in the index first: if import fails, nothing will show up
        ImpUtils.ExecuteSQL(calculationObject, indexDb, 'DELETE FROM datasetindex WHERE id="{0}"'.format(datasetId))

        globalSettings = SettingsLoader.SettingsLoader(os.path.join(datasetFolder, 'settings'))
        globalSettings.RequireTokens(['Name'])
        globalSettings.AddTokenIfMissing('Description','')

        print('Global settings: '+str(globalSettings.Get()))


        if not importSettings['ConfigOnly']:
            # Dropping existing database
            calculationObject.SetInfo('Dropping database')
            print('Dropping database')
            try:
                ImpUtils.ExecuteSQL(calculationObject, indexDb, 'DROP DATABASE IF EXISTS {0}'.format(DBDBESC(datasetId)))
            except:
                pass
            ImpUtils.ExecuteSQL(calculationObject, indexDb, 'CREATE DATABASE {0}'.format(DBDBESC(datasetId)))

            # Creating new database
            scriptPath = os.path.dirname(os.path.realpath(__file__))
            calculationObject.SetInfo('Creating database')
            print('Creating new database')
            ImpUtils.ExecuteSQLScript(calculationObject, scriptPath + '/createdataset.sql', datasetId)
            ImpUtils.ExecuteSQL(calculationObject, datasetId, 'INSERT INTO `settings` VALUES ("DBSchemaVersion", "{0}.{1}")'.format(
                schemaversion.major,
                schemaversion.minor
            ))
        else:
            #Check existence of database
            sql = "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA  WHERE SCHEMA_NAME='{0}'".format(datasetId)
            with DQXDbTools.DBCursor(calculationObject.credentialInfo) as cur:
                cur.execute(sql)
                rs = cur.fetchone()
                if rs is None:
                    raise Exception('Database does not yet exist. Please do a full import or top N preview import.')
            # Verify is major schema version is OK - otherways we can't do config update only
            currentVersion = GetCurrentSchemaVersion(calculationObject, datasetId)
            if currentVersion[0] < schemaversion.major:
                raise Exception("The database schema of this dataset is outdated. Actualise it by running a full data import or or top N preview import.")
 

        ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DELETE FROM propertycatalog')
        ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DELETE FROM summaryvalues')
        ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DELETE FROM tablecatalog')
        ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DELETE FROM settings')
        ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DELETE FROM settings WHERE id<>"DBSchemaVersion"')
        ImpUtils.ExecuteSQL(calculationObject, datasetId, 'DELETE FROM customdatacatalog')

        workspaceId = None
        
        importer = ImportDataTable(calculationObject, datasetId, importSettings, workspaceId, baseFolder = baseFolder)
        importer.importAllDataTables()

        import2D = Import2DDataTable(calculationObject, datasetId, importSettings, workspaceId, baseFolder, dataDir = '2D_datatables')
        import2D.importAll2DTables()


        if os.path.exists(os.path.join(datasetFolder, 'refgenome')):
            ImportRefGenome.ImportRefGenome(calculationObject, datasetId, os.path.join(datasetFolder, 'refgenome'), importSettings)
            globalSettings.AddTokenIfMissing('hasGenomeBrowser', True)

        ImportDocs(calculationObject, datasetFolder, datasetId)

        importWorkspaces = ImportWorkspaces(calculationObject, datasetId, importSettings, workspaceId, dataDir = 'workspaces')
        importWorkspaces.importAllWorkspaces()

        # Global settings
        with calculationObject.LogHeader('Defining global settings'):
            ImpUtils.ImportGlobalSettings(calculationObject, datasetId, globalSettings)

        # Finalise: register dataset
        with calculationObject.LogHeader('Registering dataset'):

            importtime = 0
            if not importSettings['ConfigOnly']:
                importtime = time.time()
            ImpUtils.ExecuteSQL(calculationObject, indexDb, 'INSERT INTO datasetindex VALUES ("{0}", "{1}", "{2}")'.format(
                datasetId,
                globalSettings['Name'],
                str(math.ceil(importtime))
            ))


if __name__ == "__main__":
    import customresponders.panoptesserver.asyncresponder as asyncresponder
    calc = asyncresponder.CalculationThread('', None, {'isRunningLocal': 'True'}, '')

    scopeOptions = ["all", "none", "1k", "10k", "100k"]

    if len(sys.argv) < 4:
        print('Arguments: DataType ImportType DataSetId [...]')
        print('DataType: "dataset", "datatable"')
        print('ImportType: '+', '.join(scopeOptions))
        sys.exit()

    ImportDataType = sys.argv[1]
    if ImportDataType not in ['dataset', 'datatable']:
        print('First argument (DataType) has to be "dataset" or "datatable"')
        sys.exit()

    ImportMethod = sys.argv[2]
    if ImportMethod not in scopeOptions:
        print('Second argument (ImportType) has to be '+', '.join(scopeOptions))
        sys.exit()
    configOnly = (ImportMethod == 'none')

    datasetid = sys.argv[3]

    if ImportDataType == 'dataset':
        print('Start importing dataset "{0}"...'.format(datasetid))
        ImportDataSet(calc, config.SOURCEDATADIR + '/datasets', datasetid,
            {
                'ConfigOnly': configOnly,
                 'ScopeStr': ImportMethod
            }
        )
        sys.exit()

    if ImportDataType == 'datatable':
        if len(sys.argv) < 6:
            print('Missing argument "datatableid"')
            sys.exit()
        datatableid = sys.argv[4]
        print('Start importing datatable "{0}.{1}"...'.format(datasetid, datatableid))
        datatableFolder = os.path.join(config.SOURCEDATADIR, 'datasets', datasetid, 'datatables', datatableid)
 #       ImportDataTable.ImportDataTable(calc, datasetid, datatableid, datatableFolder,
 #           {
 #               'ConfigOnly': configOnly
 #           }
 #       )
        sys.exit()

