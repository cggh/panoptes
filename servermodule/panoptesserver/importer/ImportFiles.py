# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import sys
import shutil
from PanoptesConfig import PanoptesConfig
from SettingsDAO import SettingsDAO
from GlobalSettings import GlobalSettings
import customresponders.panoptesserver.schemaversion as schemaversion

from ImportDataTable import ImportDataTable
from Import2DDataTable import Import2DDataTable
import ImportRefGenome
from ImportWorkspaces import ImportWorkspaces
from PluginLoader import PluginLoader



def ImportDocs(calculationObject, datasetFolder, datasetId):
    config = PanoptesConfig(calculationObject)
    sourceDocFolder = os.path.join(datasetFolder, 'doc')
    if not(os.path.exists(sourceDocFolder)):
        return
    with calculationObject.LogHeader('Creating documentation'):
        destDocFolder = os.path.join(config.getBaseDir(), 'Docs', datasetId)
        try:
            shutil.rmtree(destDocFolder)
        except OSError:
            #Don't fail if exists
            pass
        shutil.copytree(sourceDocFolder, destDocFolder)





def ImportDataSet(calculationObject, baseFolder, datasetId, importSettings):
    with calculationObject.LogHeader('Importing dataset {0}'.format(datasetId)):
        calculationObject.Log('Import settings: '+str(importSettings))

        datasetFolder = os.path.join(baseFolder, datasetId)


        dao = SettingsDAO(calculationObject, datasetId, None)
        dao.removeDatasetMasterRef()

        globalSettings = GlobalSettings(os.path.join(datasetFolder, 'settings'))

        print('Global settings: '+str(globalSettings))


        if not importSettings['ConfigOnly']:
            # Dropping existing database
            dao = SettingsDAO(calculationObject, datasetId, None)
            calculationObject.SetInfo('Dropping database')
            dao.createDatabase()

            # Creating new database
            scriptPath = os.path.dirname(os.path.realpath(__file__))
            calculationObject.SetInfo('Creating database')
            dao.loadFile(scriptPath + "/createdataset.sql")
            
            dao.setDatabaseVersion(schemaversion.major, schemaversion.minor)
        else:
            #Raises an exception if not present
            dao.isDatabasePresent()
            # Verify is major schema version is OK - otherways we can't do config update only
            currentVersion = dao.getCurrentSchemaVersion()
            if currentVersion[0] < schemaversion.major:
                raise Exception("The database schema of this dataset is outdated. Actualise it by running a full data import or or top N preview import.")
 

        dao.clearDatasetCatalogs()

        workspaceId = None
        
        modules = PluginLoader(calculationObject, datasetId, importSettings, workspaceId)
        modules.importAll('pre')
        
        importer = ImportDataTable(calculationObject, datasetId, importSettings, workspaceId, baseFolder = baseFolder)
        importer.importAllDataTables()

        import2D = Import2DDataTable(calculationObject, datasetId, importSettings, workspaceId, baseFolder, dataDir = '2D_datatables')
        import2D.importAll2DTables()


        if ImportRefGenome.ImportRefGenome(calculationObject, datasetId, baseFolder, importSettings):
            globalSettings['hasGenomeBrowser'] = True
        
        ImportDocs(calculationObject, datasetFolder, datasetId)

        importWorkspaces = ImportWorkspaces(calculationObject, datasetId, importSettings, workspaceId, dataDir = 'workspaces')
        importWorkspaces.importAllWorkspaces()

        # Global settings
        with calculationObject.LogHeader('Defining global settings'):
            globalSettings.saveGlobalSettings(calculationObject, datasetId)

        # Finalise: register dataset
        with calculationObject.LogHeader('Registering dataset'):
            dao.registerDataset(globalSettings['Name'], importSettings['ConfigOnly'])
            
        modules.importAll('post')


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

    conf = PanoptesConfig(calc)
    if ImportDataType == 'dataset':
        print('Start importing dataset "{0}"...'.format(datasetid))
        ImportDataSet(calc, conf.getSourceDataDir() + '/datasets', datasetid,
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

